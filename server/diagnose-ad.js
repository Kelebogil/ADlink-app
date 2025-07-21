// Load environment variables
require('dotenv').config();

const net = require('net');
const dns = require('dns');
const util = require('util');
const dnsLookup = util.promisify(dns.lookup);

console.log('🔍 Active Directory Connectivity Diagnostics');
console.log('=' .repeat(50));

// Configuration from .env
const adConfig = {
  url: process.env.AD_URL,
  baseDN: process.env.AD_BASE_DN,
  username: process.env.AD_USERNAME,
  password: process.env.AD_PASSWORD,
  domain: process.env.AD_DOMAIN
};

async function runDiagnostics() {
  console.log('📋 Current Configuration:');
  console.log(`   URL: ${adConfig.url}`);
  console.log(`   Base DN: ${adConfig.baseDN}`);
  console.log(`   Username: ${adConfig.username}`);
  console.log(`   Domain: ${adConfig.domain}`);
  console.log('');

  // Test 1: URL Format Check
  console.log('🔧 Test 1: URL Format Validation');
  const urlIssues = validateAdUrl(adConfig.url);
  if (urlIssues.length > 0) {
    console.log('❌ URL Format Issues:');
    urlIssues.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
    console.log('✅ Recommended URL format: ldap://Test.local:389');
    console.log('   or for secure connection: ldaps://Test.local:636');
  } else {
    console.log('✅ URL format looks good');
  }
  console.log('');

  // Test 2: DNS Resolution
  console.log('🔧 Test 2: DNS Resolution');
  const domain = extractDomainFromUrl(adConfig.url);
  if (domain) {
    try {
      const result = await dnsLookup(domain);
      console.log(`✅ DNS Resolution successful: ${domain} -> ${result.address}`);
    } catch (error) {
      console.log(`❌ DNS Resolution failed for ${domain}: ${error.message}`);
      console.log('   This could indicate:');
      console.log('   - Domain name is incorrect');
      console.log('   - DNS server cannot resolve the domain');
      console.log('   - Network connectivity issues');
    }
  } else {
    console.log('❌ Could not extract domain from URL');
  }
  console.log('');

  // Test 3: Port Connectivity
  console.log('🔧 Test 3: Port Connectivity');
  const portInfo = extractPortFromUrl(adConfig.url);
  if (portInfo.host && portInfo.port) {
    const connected = await testPortConnection(portInfo.host, portInfo.port);
    if (connected) {
      console.log(`✅ Port ${portInfo.port} is reachable on ${portInfo.host}`);
    } else {
      console.log(`❌ Port ${portInfo.port} is not reachable on ${portInfo.host}`);
      console.log('   This could indicate:');
      console.log('   - AD server is not running');
      console.log('   - Firewall blocking the connection');
      console.log('   - Incorrect port number');
    }
  } else {
    console.log('❌ Could not extract host/port information from URL');
  }
  console.log('');

  // Test 4: Base DN Format Check
  console.log('🔧 Test 4: Base DN Validation');
  const baseDnIssues = validateBaseDn(adConfig.baseDN, adConfig.domain);
  if (baseDnIssues.length > 0) {
    console.log('❌ Base DN Issues:');
    baseDnIssues.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
    console.log(`✅ Recommended Base DN for domain ${adConfig.domain}:`);
    console.log(`   DC=${adConfig.domain.replace(/\./g, ',DC=')}`);
  } else {
    console.log('✅ Base DN format looks good');
  }
  console.log('');

  // Test 5: Username Format Check
  console.log('🔧 Test 5: Username Format Validation');
  const usernameIssues = validateUsername(adConfig.username, adConfig.domain);
  if (usernameIssues.length > 0) {
    console.log('❌ Username Issues:');
    usernameIssues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('✅ Username format looks good');
  }
  console.log('');

  // Test 6: Network Connectivity Summary
  console.log('🔧 Test 6: Network Connectivity Summary');
  console.log('   Testing basic network connectivity...');
  
  // Try to connect to common AD ports
  const commonPorts = [389, 636, 3268, 3269];
  const host = extractDomainFromUrl(adConfig.url);
  
  if (host) {
    for (const port of commonPorts) {
      const connected = await testPortConnection(host, port);
      const portName = getPortName(port);
      if (connected) {
        console.log(`   ✅ Port ${port} (${portName}) - Open`);
      } else {
        console.log(`   ❌ Port ${port} (${portName}) - Closed/Filtered`);
      }
    }
  }
  
  console.log('');
  console.log('📊 Summary and Recommendations:');
  console.log('=' .repeat(50));
  
  // Provide specific recommendations based on findings
  if (domain) {
    console.log('✅ Configuration Analysis:');
    console.log(`   - Domain: ${domain}`);
    console.log(`   - Expected LDAP URL: ldap://${domain}:389`);
    console.log(`   - Expected Base DN: DC=${domain.replace(/\./g, ',DC=')}`);
    console.log(`   - Username format: username@${domain}`);
    console.log('');
  }
  
  console.log('🔧 Next Steps:');
  console.log('   1. Verify your AD server is running and accessible');
  console.log('   2. Check if Windows Firewall or network firewalls are blocking LDAP ports');
  console.log('   3. Ensure your service account has proper AD permissions');
  console.log('   4. Test with a domain administrator account first');
  console.log('   5. Consider using the fully qualified domain name (FQDN)');
  console.log('');
  
  if (urlIssues.length > 0 || baseDnIssues.length > 0 || usernameIssues.length > 0) {
    console.log('💡 Suggested .env Configuration:');
    console.log(`AD_URL=ldap://${adConfig.domain}:389`);
    console.log(`AD_BASE_DN=DC=${adConfig.domain.replace(/\./g, ',DC=')}`);
    console.log(`AD_USERNAME=test1@${adConfig.domain}`);
    console.log('AD_PASSWORD=your_password_here');
    console.log(`AD_DOMAIN=${adConfig.domain}`);
  }
}

function validateAdUrl(url) {
  const issues = [];
  
  if (!url) {
    issues.push('AD_URL is not set');
    return issues;
  }
  
  if (!url.startsWith('ldap://') && !url.startsWith('ldaps://')) {
    issues.push('URL should start with ldap:// or ldaps://');
  }
  
  if (url.startsWith('ldap:') && !url.startsWith('ldap://')) {
    issues.push('URL format should be ldap://domain:port, not ldap:domain');
  }
  
  if (!url.includes(':') || url.split(':').length < 2) {
    issues.push('URL should include port number (e.g., ldap://domain:389)');
  }
  
  return issues;
}

function validateBaseDn(baseDn, domain) {
  const issues = [];
  
  if (!baseDn) {
    issues.push('AD_BASE_DN is not set');
    return issues;
  }
  
  if (!baseDn.startsWith('DC=')) {
    issues.push('Base DN should start with DC=');
  }
  
  if (domain && !baseDn.toLowerCase().includes(domain.toLowerCase().replace(/\./g, ',dc='))) {
    issues.push('Base DN should match your domain structure');
  }
  
  return issues;
}

function validateUsername(username, domain) {
  const issues = [];
  
  if (!username) {
    issues.push('AD_USERNAME is not set');
    return issues;
  }
  
  if (!username.includes('@')) {
    issues.push('Username should be in format user@domain.com');
  }
  
  if (domain && !username.toLowerCase().includes(domain.toLowerCase())) {
    issues.push('Username domain should match AD_DOMAIN');
  }
  
  return issues;
}

function extractDomainFromUrl(url) {
  if (!url) return null;
  
  try {
    // Handle both ldap://domain:port and ldap:domain formats
    let domain = url.replace(/^ldaps?:\/\//, '').replace(/^ldaps?:/, '');
    domain = domain.split(':')[0];
    return domain;
  } catch (error) {
    return null;
  }
}

function extractPortFromUrl(url) {
  if (!url) return { host: null, port: null };
  
  try {
    let cleanUrl = url.replace(/^ldaps?:\/\//, '').replace(/^ldaps?:/, '');
    const parts = cleanUrl.split(':');
    const host = parts[0];
    const port = parts[1] ? parseInt(parts[1]) : (url.startsWith('ldaps://') ? 636 : 389);
    
    return { host, port };
  } catch (error) {
    return { host: null, port: null };
  }
}

function testPortConnection(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

function getPortName(port) {
  const portNames = {
    389: 'LDAP',
    636: 'LDAPS (SSL)',
    3268: 'Global Catalog',
    3269: 'Global Catalog SSL'
  };
  
  return portNames[port] || 'Unknown';
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('❌ Diagnostic error:', error.message);
  process.exit(1);
});
