// Load environment variables
require('dotenv').config();
const ActiveDirectory = require('activedirectory2');

// Active Directory configuration from .env
const adConfig = {
  url: process.env.AD_URL,
  baseDN: process.env.AD_BASE_DN,
  username: process.env.AD_USERNAME,
  password: process.env.AD_PASSWORD
};

console.log('🔍 Testing Active Directory Connection...');
console.log('📋 Configuration:');
console.log(`   URL: ${adConfig.url}`);
console.log(`   Base DN: ${adConfig.baseDN}`);
console.log(`   Username: ${adConfig.username}`);
console.log(`   Domain: ${process.env.AD_DOMAIN}`);
console.log('');

// Test 1: Check if configuration is complete
console.log('🔧 Test 1: Configuration Check');
if (!adConfig.url || !adConfig.baseDN || !adConfig.username || !adConfig.password) {
  console.log('❌ Active Directory configuration is incomplete');
  console.log('   Please check your .env file for the following variables:');
  console.log('   - AD_URL');
  console.log('   - AD_BASE_DN');
  console.log('   - AD_USERNAME');
  console.log('   - AD_PASSWORD');
  process.exit(1);
}
console.log('✅ Configuration appears complete');
console.log('');

// Test 2: Initialize AD connection
console.log('🔧 Test 2: Initialize AD Connection');
let ad;
try {
  ad = new ActiveDirectory(adConfig);
  console.log('✅ ActiveDirectory object created successfully');
} catch (error) {
  console.log('❌ Failed to create ActiveDirectory object:', error.message);
  process.exit(1);
}
console.log('');

// Test 3: Test authentication with provided credentials
console.log('🔧 Test 3: Authentication Test');
console.log(`   Testing authentication for: ${adConfig.username}`);

ad.authenticate(adConfig.username, adConfig.password, (err, auth) => {
  if (err) {
    console.log('❌ Authentication failed:', err.message);
    console.log('   This could indicate:');
    console.log('   - Incorrect credentials');
    console.log('   - Network connectivity issues');
    console.log('   - AD server not accessible');
    console.log('   - Incorrect AD URL or configuration');
    testBasicConnection();
  } else if (auth) {
    console.log('✅ Authentication successful!');
    console.log('   Your application can connect to Active Directory');
    testUserLookup();
  } else {
    console.log('❌ Authentication failed - Invalid credentials');
    console.log('   Please check your AD_USERNAME and AD_PASSWORD in .env');
    testBasicConnection();
  }
});

// Test 4: Test basic connection (without authentication)
function testBasicConnection() {
  console.log('');
  console.log('🔧 Test 4: Basic Connection Test');
  console.log('   Testing basic LDAP connection...');
  
  // Try to find a specific user instead of using wildcard
  ad.findUser('test1', (err, user) => {
    if (err) {
      console.log('❌ Connection test failed:', err.message);
      console.log('   Possible issues:');
      console.log('   - AD server is not reachable');
      console.log('   - Incorrect AD_URL');
      console.log('   - Network/firewall issues');
      console.log('   - AD_BASE_DN is incorrect');
      showTroubleshootingTips();
    } else {
      console.log('✅ Basic connection successful!');
      console.log(`   Directory search works (found user: ${user ? user.cn || 'user found' : 'no user found'})`);
      console.log('   The connection works, but authentication credentials may be incorrect');
      showTroubleshootingTips();
    }
  });
}

// Test 5: User lookup test
function testUserLookup() {
  console.log('');
  console.log('🔧 Test 5: User Lookup Test');
  console.log(`   Looking up user: ${adConfig.username}`);
  
  ad.findUser(adConfig.username, (err, user) => {
    if (err) {
      console.log('❌ User lookup failed:', err.message);
    } else if (user) {
      console.log('✅ User found in Active Directory!');
      console.log(`   Display Name: ${user.displayName || 'N/A'}`);
      console.log(`   Email: ${user.mail || 'N/A'}`);
      console.log(`   Common Name: ${user.cn || 'N/A'}`);
      console.log(`   Distinguished Name: ${user.dn || 'N/A'}`);
    } else {
      console.log('❌ User not found in Active Directory');
    }
    
    console.log('');
    console.log('🎉 AD Connection Test Complete!');
    console.log('   Your application is properly connected to Active Directory');
    console.log('   You can now use AD authentication in your app');
  });
}

function showTroubleshootingTips() {
  console.log('');
  console.log('🔧 Troubleshooting Tips:');
  console.log('   1. Verify AD server is running and accessible');
  console.log('   2. Check if AD_URL format is correct (e.g., ldap://domain.com:389)');
  console.log('   3. Verify AD_BASE_DN matches your domain (e.g., DC=domain,DC=com)');
  console.log('   4. Ensure AD_USERNAME includes domain (e.g., user@domain.com)');
  console.log('   5. Check firewall settings allow LDAP traffic (port 389/636)');
  console.log('   6. Verify the service account has proper permissions');
  console.log('');
  console.log('   Current configuration:');
  console.log(`   - URL: ${adConfig.url}`);
  console.log(`   - Base DN: ${adConfig.baseDN}`);
  console.log(`   - Username: ${adConfig.username}`);
  console.log(`   - Domain: ${process.env.AD_DOMAIN}`);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
