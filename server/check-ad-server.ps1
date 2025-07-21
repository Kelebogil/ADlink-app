# PowerShell script to check Active Directory server status and connectivity
# Run this script to diagnose AD server issues

Write-Host "=== Active Directory Server Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ADServer = "Test.local"
$ADServerIP = "10.0.2.15"
$LDAPPort = 389
$LDAPSPort = 636

# Test 1: Ping the AD server
Write-Host "Test 1: Ping AD Server" -ForegroundColor Yellow
Write-Host "Pinging $ADServer ($ADServerIP)..." -ForegroundColor Gray

$pingResult = Test-Connection -ComputerName $ADServerIP -Count 2 -Quiet
if ($pingResult) {
    Write-Host "✅ Ping successful - Server is reachable" -ForegroundColor Green
} else {
    Write-Host "❌ Ping failed - Server is not reachable" -ForegroundColor Red
    Write-Host "   This could indicate:" -ForegroundColor Gray
    Write-Host "   - AD server is offline" -ForegroundColor Gray
    Write-Host "   - Network connectivity issues" -ForegroundColor Gray
    Write-Host "   - ICMP is blocked by firewall" -ForegroundColor Gray
}
Write-Host ""

# Test 2: Check LDAP port connectivity
Write-Host "Test 2: LDAP Port Connectivity" -ForegroundColor Yellow
Write-Host "Testing port $LDAPPort on $ADServer..." -ForegroundColor Gray

$ldapTest = Test-NetConnection -ComputerName $ADServerIP -Port $LDAPPort -InformationLevel Quiet
if ($ldapTest) {
    Write-Host "✅ Port $LDAPPort is open and accessible" -ForegroundColor Green
} else {
    Write-Host "❌ Port $LDAPPort is closed or filtered" -ForegroundColor Red
    Write-Host "   This could indicate:" -ForegroundColor Gray
    Write-Host "   - AD Domain Services are not running" -ForegroundColor Gray
    Write-Host "   - Windows Firewall is blocking LDAP" -ForegroundColor Gray
    Write-Host "   - Network firewall is blocking port 389" -ForegroundColor Gray
}
Write-Host ""

# Test 3: Check LDAPS port connectivity
Write-Host "Test 3: LDAPS Port Connectivity" -ForegroundColor Yellow
Write-Host "Testing port $LDAPSPort on $ADServer..." -ForegroundColor Gray

$ldapsTest = Test-NetConnection -ComputerName $ADServerIP -Port $LDAPSPort -InformationLevel Quiet
if ($ldapsTest) {
    Write-Host "✅ Port $LDAPSPort is open and accessible" -ForegroundColor Green
} else {
    Write-Host "❌ Port $LDAPSPort is closed or filtered" -ForegroundColor Red
}
Write-Host ""

# Test 4: Check if this machine is domain-joined
Write-Host "Test 4: Domain Membership" -ForegroundColor Yellow
$computerInfo = Get-ComputerInfo
if ($computerInfo.PartOfDomain) {
    Write-Host "✅ This computer is domain-joined" -ForegroundColor Green
    Write-Host "   Domain: $($computerInfo.Domain)" -ForegroundColor Gray
} else {
    Write-Host "❌ This computer is not domain-joined" -ForegroundColor Red
    Write-Host "   This might affect AD authentication" -ForegroundColor Gray
}
Write-Host ""

# Test 5: DNS resolution
Write-Host "Test 5: DNS Resolution" -ForegroundColor Yellow
Write-Host "Resolving $ADServer..." -ForegroundColor Gray

try {
    $dnsResult = Resolve-DnsName -Name $ADServer -Type A -ErrorAction Stop
    Write-Host "✅ DNS resolution successful:" -ForegroundColor Green
    foreach ($record in $dnsResult) {
        Write-Host "   $ADServer -> $($record.IPAddress)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ DNS resolution failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Check Windows services that might be relevant
Write-Host "Test 6: Relevant Windows Services" -ForegroundColor Yellow
$servicesToCheck = @(
    'DNS',
    'Netlogon',
    'W32Time',
    'Workstation',
    'LanmanWorkstation'
)

foreach ($service in $servicesToCheck) {
    try {
        $serviceInfo = Get-Service -Name $service -ErrorAction Stop
        $status = $serviceInfo.Status
        if ($status -eq 'Running') {
            Write-Host "✅ $service service is running" -ForegroundColor Green
        } else {
            Write-Host "❌ $service service is $status" -ForegroundColor Red
        }
    } catch {
        Write-Host "⚠️  $service service not found" -ForegroundColor Yellow
    }
}
Write-Host ""

# Summary and recommendations
Write-Host "=== Summary and Recommendations ===" -ForegroundColor Cyan
Write-Host ""

if (-not $pingResult) {
    Write-Host "🔧 Network Connectivity Issues:" -ForegroundColor Red
    Write-Host "   - Verify the AD server at $ADServerIP is running" -ForegroundColor Gray
    Write-Host "   - Check network connectivity between this machine and the AD server" -ForegroundColor Gray
    Write-Host "   - Consider using the server's hostname instead of IP" -ForegroundColor Gray
}

if (-not $ldapTest) {
    Write-Host "🔧 LDAP Port Issues:" -ForegroundColor Red
    Write-Host "   - On the AD server, check if Active Directory Domain Services are running" -ForegroundColor Gray
    Write-Host "   - Verify Windows Firewall settings on the AD server" -ForegroundColor Gray
    Write-Host "   - Check if port 389 is open in Windows Firewall" -ForegroundColor Gray
    Write-Host "   - Run this on the AD server: netstat -an | findstr :389" -ForegroundColor Gray
}

if (-not $computerInfo.PartOfDomain) {
    Write-Host "🔧 Domain Membership:" -ForegroundColor Yellow
    Write-Host "   - Consider joining this machine to the domain for better AD integration" -ForegroundColor Gray
    Write-Host "   - Or ensure proper DNS and network configuration for domain access" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. If ping fails, fix network connectivity first" -ForegroundColor Gray
Write-Host "   2. If LDAP port is closed, check AD server services and firewall" -ForegroundColor Gray
Write-Host "   3. Verify AD Domain Services are running on the server" -ForegroundColor Gray
Write-Host "   4. Test with a known working AD account" -ForegroundColor Gray
Write-Host "   5. Consider using LDAP tools like ldp.exe for further testing" -ForegroundColor Gray

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
