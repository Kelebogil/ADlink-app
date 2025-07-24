const ActiveDirectory = require('activedirectory2');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
require('dotenv').config();

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
   * Create a new user in Active Directory using PowerShell
   * This requires the server to have PowerShell and AD module installed
   */
  async createADUser(userData) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    const { name, email, password, username } = userData;
    
    // Generate username if not provided (use email prefix)
    const adUsername = username || email.split('@')[0];
    
    // Extract first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // PowerShell script to create AD user
    const psScript = `
    try {
      Import-Module ActiveDirectory -ErrorAction Stop
      
      # Check if user already exists
      $existingUser = Get-ADUser -Filter "UserPrincipalName -eq '${email}'" -ErrorAction SilentlyContinue
      if ($existingUser) {
        Write-Output "ERROR: User already exists in Active Directory"
        exit 1
      }
      
      # Create the user
      $securePassword = ConvertTo-SecureString "${password}" -AsPlainText -Force
      
      New-ADUser -Name "${name}" \\
                 -GivenName "${firstName}" \\
                 -Surname "${lastName}" \\
                 -UserPrincipalName "${email}" \\
                 -SamAccountName "${adUsername}" \\
                 -EmailAddress "${email}" \\
                 -AccountPassword $securePassword \\
                 -Enabled $true \\
                 -PasswordNeverExpires $false \\
                 -CannotChangePassword $false \\
                 -Path "${this.getUsersOU()}"
      
      Write-Output "SUCCESS: User ${email} created successfully in Active Directory"
    } catch {
      Write-Output "ERROR: $($_.Exception.Message)"
      exit 1
    }`;

    try {
      console.log(`Creating AD user: ${email}`);
      const { stdout, stderr } = await execAsync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);
      
      if (stderr) {
        console.error('PowerShell stderr:', stderr);
      }
      
      if (stdout.includes('ERROR:')) {
        throw new Error(stdout.replace('ERROR: ', ''));
      }
      
      if (stdout.includes('SUCCESS:')) {
        console.log('AD user created successfully:', email);
        return true;
      }
      
      throw new Error('Unknown error creating AD user');
    } catch (error) {
      console.error('Failed to create AD user:', error.message);
      throw new Error(`AD user creation failed: ${error.message}`);
    }
  }

  /**
   * Update an existing user in Active Directory
   */
  async updateADUser(email, updateData) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    const { name } = updateData;
    
    // Extract first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const psScript = `
    try {
      Import-Module ActiveDirectory -ErrorAction Stop
      
      # Find and update the user
      $user = Get-ADUser -Filter "UserPrincipalName -eq '${email}'" -ErrorAction Stop
      
      Set-ADUser -Identity $user.DistinguishedName \\
                 -DisplayName "${name}" \\
                 -GivenName "${firstName}" \\
                 -Surname "${lastName}"
      
      Write-Output "SUCCESS: User ${email} updated successfully in Active Directory"
    } catch {
      Write-Output "ERROR: $($_.Exception.Message)"
      exit 1
    }`;

    try {
      console.log(`Updating AD user: ${email}`);
      const { stdout, stderr } = await execAsync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);
      
      if (stderr) {
        console.error('PowerShell stderr:', stderr);
      }
      
      if (stdout.includes('ERROR:')) {
        throw new Error(stdout.replace('ERROR: ', ''));
      }
      
      if (stdout.includes('SUCCESS:')) {
        console.log('AD user updated successfully:', email);
        return true;
      }
      
      throw new Error('Unknown error updating AD user');
    } catch (error) {
      console.error('Failed to update AD user:', error.message);
      throw new Error(`AD user update failed: ${error.message}`);
    }
  }

  /**
   * Delete a user from Active Directory
   */
  async deleteADUser(email) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    const psScript = `
    try {
      Import-Module ActiveDirectory -ErrorAction Stop
      
      # Find and delete the user
      $user = Get-ADUser -Filter "UserPrincipalName -eq '${email}'" -ErrorAction Stop
      Remove-ADUser -Identity $user.DistinguishedName -Confirm:$false
      
      Write-Output "SUCCESS: User ${email} deleted successfully from Active Directory"
    } catch {
      Write-Output "ERROR: $($_.Exception.Message)"
      exit 1
    }`;

    try {
      console.log(`Deleting AD user: ${email}`);
      const { stdout, stderr } = await execAsync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);
      
      if (stderr) {
        console.error('PowerShell stderr:', stderr);
      }
      
      if (stdout.includes('ERROR:')) {
        throw new Error(stdout.replace('ERROR: ', ''));
      }
      
      if (stdout.includes('SUCCESS:')) {
        console.log('AD user deleted successfully:', email);
        return true;
      }
      
      throw new Error('Unknown error deleting AD user');
    } catch (error) {
      console.error('Failed to delete AD user:', error.message);
      throw new Error(`AD user deletion failed: ${error.message}`);
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
   * Reset a user's password in Active Directory
   */
  async resetADUserPassword(email, newPassword) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    const psScript = `
    try {
      Import-Module ActiveDirectory -ErrorAction Stop
      
      # Find and reset password
      $user = Get-ADUser -Filter "UserPrincipalName -eq '${email}'" -ErrorAction Stop
      $securePassword = ConvertTo-SecureString "${newPassword}" -AsPlainText -Force
      Set-ADAccountPassword -Identity $user.DistinguishedName -NewPassword $securePassword -Reset
      
      Write-Output "SUCCESS: Password reset successfully for ${email}"
    } catch {
      Write-Output "ERROR: $($_.Exception.Message)"
      exit 1
    }`;

    try {
      console.log(`Resetting AD password for: ${email}`);
      const { stdout, stderr } = await execAsync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);
      
      if (stderr) {
        console.error('PowerShell stderr:', stderr);
      }
      
      if (stdout.includes('ERROR:')) {
        throw new Error(stdout.replace('ERROR: ', ''));
      }
      
      if (stdout.includes('SUCCESS:')) {
        console.log('AD password reset successfully:', email);
        return true;
      }
      
      throw new Error('Unknown error resetting AD password');
    } catch (error) {
      console.error('Failed to reset AD password:', error.message);
      throw new Error(`AD password reset failed: ${error.message}`);
    }
  }
}

module.exports = new ADUserManager();
