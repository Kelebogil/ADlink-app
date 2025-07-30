const ActiveDirectory = require('activedirectory2');
require('dotenv').config();
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = util.promisify(exec);

class ADUserManager {
  constructor() {
    this.adConfig = {
      url: process.env.AD_URL,
      baseDN: process.env.AD_BASE_DN,
      username: process.env.AD_USERNAME,
      password: process.env.AD_PASSWORD,
      domain: process.env.AD_DOMAIN
    };

    // Initialize AD connection if configured
    this.ad = null;
    if (process.env.AUTH_METHOD === 'ad' || process.env.AUTH_METHOD === 'hybrid') {
      if (this.adConfig.url && this.adConfig.baseDN && this.adConfig.username && this.adConfig.password) {
        this.ad = new ActiveDirectory(this.adConfig);
        console.log('AD User Manager initialized');
      } else {
        console.warn('AD configuration incomplete. AD user creation disabled.');
      }
    }
  }

  /**
   * Check if AD is configured and available
   */
  isADConfigured() {
    return this.ad !== null && process.env.AD_CREATE_USERS === 'true';
  }

  /**
   * Execute PowerShell script safely using temp file
   */
  async executePowerShellScript(scriptContent) {
    const tempFileName = `ad-script-${Date.now()}.ps1`;
    const tempFilePath = path.join(__dirname, '..', 'temp', tempFileName);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Write script to temp file
      fs.writeFileSync(tempFilePath, scriptContent, 'utf8');
      
      // Execute the script
      const { stdout, stderr } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempFilePath}"`);
      
      return { stdout, stderr };
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  /**
   * Create a new user in Active Directory using PowerShell
   */
  async createADUser(userData) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory user creation not configured or disabled');
    }

    const { name, email, password, username } = userData;
    // Create a valid SamAccountName (no spaces, special chars, max 20 chars)
    const adUsername = username || email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    const userPrincipalName = email;
    const ou = this.getUsersOU();
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    const psScript = `
Import-Module ActiveDirectory

# Create credential object
$username = "${this.adConfig.username}"
$password = ConvertTo-SecureString "${this.adConfig.password}" -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($username, $password)

try {
    Write-Host "Creating AD user: ${email}"
    
    $params = @{
        Name = "${name}"
        SamAccountName = "${adUsername}"
        UserPrincipalName = "${userPrincipalName}"
        AccountPassword = (ConvertTo-SecureString "${password}" -AsPlainText -Force)
        Path = "${ou}"
        Enabled = $true
        GivenName = "${firstName}"
        Surname = "${lastName}"
        EmailAddress = "${email}"
        ChangePasswordAtLogon = $false
        Server = "192.168.16.40"
        Credential = $credential
    }
    
    New-ADUser @params
    Write-Host "SUCCESS: User ${email} created successfully"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    throw $_
}
`;

    try {
      console.log(`Attempting to create AD user: ${email}`);
      const { stdout, stderr } = await this.executePowerShellScript(psScript);
      
      console.log('PowerShell STDOUT:', stdout);
      if (stderr) {
        console.log('PowerShell STDERR:', stderr);
        if (stderr.toLowerCase().includes('already exist')) {
            throw new Error('User already exists in Active Directory');
        }
        if (stderr.toLowerCase().includes('error') || stderr.toLowerCase().includes('failed')) {
          throw new Error(`PowerShell error: ${stderr}`);
        }
      }
      
      if (stdout.includes('SUCCESS:')) {
        console.log(`✅ Successfully created AD user: ${email}`);
        return true;
      } else {
        throw new Error('User creation did not complete successfully');
      }
    } catch (error) {
      console.error(`❌ Failed to create AD user: ${email}`, error.message);
      throw new Error(`Failed to create user in Active Directory: ${error.message}`);
    }
  }


  /**
   * Update an existing user in Active Directory using PowerShell
   */
  async updateADUser(email, updateData) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    const { name } = updateData;
    if(!name){
        console.warn("No update data provided for AD user");
        return;
    }

    const sanitizedEmail = email.replace(/'/g, "''");
    const sanitizedName = name.replace(/'/g, "''");

    const psCommand = `
      Import-Module ActiveDirectory;
      $credential = New-Object System.Management.Automation.PSCredential('${this.adConfig.username}', (ConvertTo-SecureString '${this.adConfig.password}' -AsPlainText -Force));
      Get-ADUser -Filter {UserPrincipalName -eq '${sanitizedEmail}'} -Server '192.168.16.40' -Credential $credential | Set-ADUser -DisplayName '${sanitizedName}' -Server '192.168.16.40' -Credential $credential;
    `;

    try {
        console.log(`Attempting to update AD user: ${email}`);
        const { stderr } = await execAsync(`powershell -Command "${psCommand}"`);
         if (stderr) {
            if (stderr.toLowerCase().includes('error') || stderr.toLowerCase().includes('failed')) {
                throw new Error(`PowerShell error: ${stderr}`);
            }
        }
        console.log(`✅ Successfully updated AD user: ${email}`);
        return true;
    }
    catch(error){
        console.error(`❌ Failed to update AD user: ${email}`, error.message);
        throw new Error(`Failed to update user in Active Directory: ${error.message}`);
    }
  }

  /**
   * Delete a user from Active Directory using PowerShell
   */
  async deleteADUser(email) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    const sanitizedEmail = email.replace(/'/g, "''");

    const psCommand = `
      Import-Module ActiveDirectory;
      $credential = New-Object System.Management.Automation.PSCredential('${this.adConfig.username}', (ConvertTo-SecureString '${this.adConfig.password}' -AsPlainText -Force));
      $user = Get-ADUser -Filter {UserPrincipalName -eq '${sanitizedEmail}'} -Server '192.168.16.40' -Credential $credential;
      if ($user) {
        Remove-ADUser -Identity $user.DistinguishedName -Confirm:$false -Server '192.168.16.40' -Credential $credential;
        Write-Host "User ${sanitizedEmail} deleted."
      } else {
        throw 'User not found in AD';
      }
    `;

    try {
        console.log(`Attempting to delete AD user: ${email}`);
        const { stderr } = await execAsync(`powershell -Command "${psCommand}"`);
        if (stderr) {
            if (stderr.toLowerCase().includes('error') || stderr.toLowerCase().includes('failed')) {
                throw new Error(`PowerShell error: ${stderr}`);
            }
        }
        console.log(`✅ Successfully deleted AD user: ${email}`);
        return true;
    }
    catch(error){
        console.error(`❌ Failed to delete AD user: ${email}`, error.message);
        if(error.message.includes("User not found in AD")){
            throw new Error('User not found in Active Directory');
        }
        throw new Error(`Failed to delete user in Active Directory: ${error.message}`);
    }
  }

  /**
   * Check if a user exists in Active Directory
   */
  async userExistsInAD(email) {
    if (!this.isADConfigured()) {
      return false;
    }

    return new Promise((resolve) => {
      this.ad.findUser(email, (err, user) => {
        if (err) {
          console.error('Error checking AD user existence:', err.message);
          resolve(false);
        } else {
          resolve(!!user);
        }
      });
    });
  }

  /**
   * Get the Organizational Unit for users
   * You may need to customize this based on your AD structure
   */
  getUsersOU() {
    // Use custom OU if specified, otherwise default to Users container
    return process.env.AD_USERS_OU || `CN=Users,${this.adConfig.baseDN}`;
  }

  /**
   * Reset a user's password in Active Directory using PowerShell
   */
  async resetADUserPassword(email, newPassword) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    const sanitizedEmail = email.replace(/'/g, "''");
    const sanitizedPassword = newPassword.replace(/'/g, "''");

     const psCommand = `
      Import-Module ActiveDirectory;
      $credential = New-Object System.Management.Automation.PSCredential('${this.adConfig.username}', (ConvertTo-SecureString '${this.adConfig.password}' -AsPlainText -Force));
      $user = Get-ADUser -Filter {UserPrincipalName -eq '${sanitizedEmail}'} -Server '192.168.16.40' -Credential $credential;
      if ($user) {
        $password = ConvertTo-SecureString -String '${sanitizedPassword}' -AsPlainText -Force;
        Set-ADAccountPassword -Identity $user -NewPassword $password -Server '192.168.16.40' -Credential $credential;
        Write-Host "Password for user ${sanitizedEmail} has been reset."
      } else {
        throw 'User not found in AD';
      }
    `;

    try {
        console.log(`Attempting to reset AD user password for: ${email}`);
        const { stderr } = await execAsync(`powershell -Command "${psCommand}"`);
        if (stderr) {
            if (stderr.toLowerCase().includes('error') || stderr.toLowerCase().includes('failed')) {
                throw new Error(`PowerShell error: ${stderr}`);
            }
        }
        console.log(`✅ Successfully reset AD password for user: ${email}`);
        return true;
    }
    catch(error){
      console.error(`❌ Failed to reset AD user password for: ${email}`, error.message);
       if (error.message.includes('User not found in AD')) {
          throw new Error('User not found in Active Directory');
      }
      throw new Error(`Failed to reset user password in Active Directory: ${error.message}`);
    }
  }
}

module.exports = new ADUserManager();
