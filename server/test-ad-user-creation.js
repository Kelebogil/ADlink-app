// Load environment variables
require('dotenv').config();
const adUserManager = require('./utils/adUserManager');

console.log('🧪 Testing Active Directory User Creation');
console.log('=' .repeat(50));

async function testADUserCreation() {
  // Test configuration
  console.log('📋 Configuration Check:');
  console.log(`   AD_CREATE_USERS: ${process.env.AD_CREATE_USERS}`);
  console.log(`   AUTH_METHOD: ${process.env.AUTH_METHOD}`);
  console.log(`   AD configured: ${adUserManager.isADConfigured()}`);
  console.log('');

  if (!adUserManager.isADConfigured()) {
    console.log('❌ AD user creation is not configured or disabled');
    console.log('   Please check your .env file and ensure:');
    console.log('   - AD_CREATE_USERS=true');
    console.log('   - All AD_* variables are set correctly');
    console.log('   - AUTH_METHOD is set to "ad" or "hybrid"');
    return;
  }

  // Test user data
  const testUser = {
    name: 'Test User AD',
    email: `testuser-${Date.now()}@${process.env.AD_DOMAIN}`,
    password: 'TestPassword123!'
  };

  console.log('🔧 Test 1: Create AD User');
  console.log(`   Creating user: ${testUser.email}`);
  
  try {
    const result = await adUserManager.createADUser(testUser);
    if (result) {
      console.log('✅ AD user created successfully!');
      
      // Test if user exists
      console.log('');
      console.log('🔧 Test 2: Verify User Exists');
      const exists = await adUserManager.userExistsInAD(testUser.email);
      if (exists) {
        console.log('✅ User found in Active Directory');
      } else {
        console.log('❌ User not found in Active Directory (might take a moment to replicate)');
      }

      // Test user update
      console.log('');
      console.log('🔧 Test 3: Update AD User');
      try {
        await adUserManager.updateADUser(testUser.email, {
          name: 'Test User AD Updated'
        });
        console.log('✅ AD user updated successfully!');
      } catch (updateError) {
        console.log('❌ Failed to update AD user:', updateError.message);
      }

      // Clean up - delete the test user
      console.log('');
      console.log('🧹 Cleanup: Delete Test User');
      try {
        await adUserManager.deleteADUser(testUser.email);
        console.log('✅ Test user deleted successfully');
      } catch (deleteError) {
        console.log('❌ Failed to delete test user:', deleteError.message);
        console.log(`   Please manually delete user: ${testUser.email}`);
      }

    } else {
      console.log('❌ AD user creation returned false');
    }
  } catch (error) {
    console.log('❌ AD user creation failed:', error.message);
    
    // Common error troubleshooting
    console.log('');
    console.log('🔧 Troubleshooting Tips:');
    
    if (error.message.includes('ActiveDirectory')) {
      console.log('   - Install Active Directory PowerShell module');
      console.log('   - Run: Install-WindowsFeature -Name RSAT-AD-PowerShell');
    }
    
    if (error.message.includes('Access denied') || error.message.includes('permission')) {
      console.log('   - Check service account permissions');
      console.log('   - Ensure account can create users in the target OU');
    }
    
    if (error.message.includes('already exists')) {
      console.log('   - User already exists in Active Directory');
      console.log('   - Clean up any existing test users');
    }

    if (error.message.includes('powershell')) {
      console.log('   - Ensure PowerShell is available and accessible');
      console.log('   - Check execution policy: Set-ExecutionPolicy RemoteSigned');
    }
  }

  console.log('');
  console.log('🎯 Test Summary:');
  console.log('   If all tests passed, your AD user creation is working correctly!');
  console.log('   Users created through your application will now be automatically');
  console.log('   created in Active Directory as well.');
  console.log('');
  console.log('📖 Next Steps:');
  console.log('   1. Test user registration via your application');
  console.log('   2. Test admin user creation via console or API');
  console.log('   3. Verify users appear in AD Users and Computers');
  console.log('   4. Check activity logs for AD creation events');
}

// Additional test functions
async function testPowerShellAccess() {
  console.log('🔧 Testing PowerShell Access...');
  
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  try {
    const { stdout } = await execAsync('powershell -Command "Get-Module -ListAvailable ActiveDirectory"');
    if (stdout.includes('ActiveDirectory')) {
      console.log('✅ Active Directory PowerShell module is available');
    } else {
      console.log('❌ Active Directory PowerShell module not found');
      console.log('   Install with: Install-WindowsFeature -Name RSAT-AD-PowerShell');
    }
  } catch (error) {
    console.log('❌ PowerShell access test failed:', error.message);
  }
}

async function runAllTests() {
  try {
    await testPowerShellAccess();
    console.log('');
    await testADUserCreation();
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
