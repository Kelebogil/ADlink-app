Write-Host "=== AD Server Connectivity Test ===" -ForegroundColor Cyan
Write-Host ""

$ADServerIP = "10.0.2.15"
$LDAPPort = 389

Write-Host "Testing connection to AD server..." -ForegroundColor Yellow
Write-Host "Server IP: $ADServerIP" -ForegroundColor Gray
Write-Host "LDAP Port: $LDAPPort" -ForegroundColor Gray
Write-Host ""

# Test ping
Write-Host "1. Testing ping..." -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName $ADServerIP -Count 2 -Quiet
if ($pingResult) {
    Write-Host "   ✅ Ping successful" -ForegroundColor Green
} else {
    Write-Host "   ❌ Ping failed" -ForegroundColor Red
}

# Test LDAP port
Write-Host "2. Testing LDAP port..." -ForegroundColor Yellow
$ldapTest = Test-NetConnection -ComputerName $ADServerIP -Port $LDAPPort -InformationLevel Quiet
if ($ldapTest) {
    Write-Host "   ✅ LDAP port is open" -ForegroundColor Green
} else {
    Write-Host "   ❌ LDAP port is closed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
if ($pingResult -and $ldapTest) {
    Write-Host "✅ AD server is reachable and LDAP port is open" -ForegroundColor Green
    Write-Host "   The issue might be with credentials or AD configuration" -ForegroundColor Gray
} elseif ($pingResult) {
    Write-Host "❌ Server is reachable but LDAP port is closed" -ForegroundColor Red
    Write-Host "   Check if AD Domain Services are running on the server" -ForegroundColor Gray
} else {
    Write-Host "❌ Server is not reachable" -ForegroundColor Red
    Write-Host "   Check network connectivity and server status" -ForegroundColor Gray
}
