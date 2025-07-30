require('dotenv').config();
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testADConnection() {
    console.log('🔍 Testing direct AD connection...');
    
    const testCommand = `
        Import-Module ActiveDirectory;
        $credential = New-Object System.Management.Automation.PSCredential('${process.env.AD_USERNAME}', (ConvertTo-SecureString '${process.env.AD_PASSWORD}' -AsPlainText -Force));
        try {
            $users = Get-ADUser -Filter * -SearchBase '${process.env.AD_USERS_OU}' -Server '192.168.16.40' -Credential $credential | Select-Object -First 5 Name, UserPrincipalName;
            Write-Host "✅ Successfully connected to AD server";
            Write-Host "Found users:";
            $users | Format-Table -AutoSize;
        } catch {
            Write-Host "❌ Failed to connect: $($_.Exception.Message)";
            throw $_;
        } 
    `;

    try {
        const { stdout, stderr } = await execAsync(`powershell -Command "${testCommand}"`);
        console.log('STDOUT:', stdout);
        if (stderr) {
            console.log('STDERR:', stderr);
        }
    } catch (error) {
        console.error('Connection test failed:', error.message);
    }
}

async function testUserCreation() {
    console.log('\n🆕 Testing user creation with detailed output...');
    
    const testUser = {
        name: 'Test User Direct',
        email: `testdirect-${Date.now()}@${process.env.AD_DOMAIN}`,
        username: `testdirect${Date.now()}`,
        password: 'TestPassword123!'
    };

    const createCommand = `
        Import-Module ActiveDirectory;
        $credential = New-Object System.Management.Automation.PSCredential('${process.env.AD_USERNAME}', (ConvertTo-SecureString '${process.env.AD_PASSWORD}' -AsPlainText -Force));
        
        try {
            Write-Host "Creating user: ${testUser.email}";
            Write-Host "Target OU: ${process.env.AD_USERS_OU}";
            
            $params = @{
                Name = '${testUser.name}'
                SamAccountName = '${testUser.username}'
                UserPrincipalName = '${testUser.email}'
                AccountPassword = (ConvertTo-SecureString -String '${testUser.password}' -AsPlainText -Force)
                Path = '${process.env.AD_USERS_OU}'
                Enabled = $true
                GivenName = 'Test'
                Surname = 'User Direct'
                EmailAddress = '${testUser.email}'
                ChangePasswordAtLogon = $false
                Server = '192.168.16.40'
                Credential = $credential
            }
            
            New-ADUser @params;
            Write-Host "✅ User created successfully";
            
            # Verify the user was created
            Start-Sleep -Seconds 2;
            $createdUser = Get-ADUser -Filter {UserPrincipalName -eq '${testUser.email}'} -Server '192.168.16.40' -Credential $credential;
            if ($createdUser) {
                Write-Host "✅ User verification successful: $($createdUser.Name)";
            } else {
                Write-Host "❌ User not found after creation";
            }
            
            # Clean up
            Remove-ADUser -Identity $createdUser.DistinguishedName -Confirm:$false -Server '192.168.16.40' -Credential $credential;
            Write-Host "🧹 Test user cleaned up";
            
        } catch {
            Write-Host "❌ User creation failed: $($_.Exception.Message)";
            throw $_;
        }
    `;

    try {
        const { stdout, stderr } = await execAsync(`powershell -Command "${createCommand}"`);
        console.log('STDOUT:', stdout);
        if (stderr) {
            console.log('STDERR:', stderr);
        }
    } catch (error) {
        console.error('User creation test failed:', error.message);
    }
}

async function runTests() {
    console.log('🧪 Direct AD Testing');
    console.log('='.repeat(50));
    console.log(`AD Server: 192.168.16.40`);
    console.log(`Domain: ${process.env.AD_DOMAIN}`);
    console.log(`Username: ${process.env.AD_USERNAME}`);
    console.log(`Base DN: ${process.env.AD_BASE_DN}`);
    console.log(`Users OU: ${process.env.AD_USERS_OU}`);
    console.log('');

    await testADConnection();
    await testUserCreation();
}

runTests().catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
});
