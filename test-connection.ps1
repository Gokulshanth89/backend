# Test and Fix Connection Script for Samsung Android
# Run this as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Samsung Android Connection Test & Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Navigate to backend folder" -ForegroundColor Yellow
    Write-Host "4. Run: .\test-connection.ps1" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit
}

# Get IP address
Write-Host "Checking network configuration..." -ForegroundColor Yellow
$ipAddresses = ipconfig | Select-String "IPv4" | ForEach-Object { $_ -replace '.*?(\d+\.\d+\.\d+\.\d+).*', '$1' }
$mainIP = $ipAddresses | Where-Object { $_ -notlike "192.168.56.*" } | Select-Object -First 1

Write-Host "Your computer's IP address: $mainIP" -ForegroundColor Green
Write-Host ""

# Check if server is running
Write-Host "Checking if backend server is running..." -ForegroundColor Yellow
$serverRunning = netstat -an | Select-String ":5000.*LISTENING"

if ($serverRunning) {
    Write-Host "✓ Backend server is running on port 5000" -ForegroundColor Green
} else {
    Write-Host "✗ Backend server is NOT running!" -ForegroundColor Red
    Write-Host "  Please start the backend server first:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit
}

Write-Host ""

# Check firewall rule
Write-Host "Checking Windows Firewall..." -ForegroundColor Yellow
$firewallRule = netsh advfirewall firewall show rule name="Node.js Backend Port 5000" 2>&1

if ($firewallRule -match "No rules match") {
    Write-Host "✗ Firewall rule does NOT exist" -ForegroundColor Red
    Write-Host "  Adding firewall rule..." -ForegroundColor Yellow
    
    netsh advfirewall firewall add rule name="Node.js Backend Port 5000" dir=in action=allow protocol=TCP localport=5000
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Firewall rule added successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to add firewall rule" -ForegroundColor Red
    }
} else {
    Write-Host "✓ Firewall rule exists" -ForegroundColor Green
}

Write-Host ""

# Test local connection
Write-Host "Testing local connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$mainIP:5000/api/health" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Server is accessible from this computer" -ForegroundColor Green
        Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Cannot access server from this computer" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Make sure your Samsung phone is on the SAME WiFi network" -ForegroundColor Yellow
Write-Host "2. Test from your phone's browser:" -ForegroundColor Yellow
Write-Host "   Open Chrome and go to: http://$mainIP:5000/api/health" -ForegroundColor White
Write-Host "   You should see: {`"status`":`"OK`",`"message`":`"Server is running`"}" -ForegroundColor Gray
Write-Host ""
Write-Host "3. If phone browser works, the Flutter app should work too!" -ForegroundColor Green
Write-Host ""
Write-Host "4. If phone browser doesn't work:" -ForegroundColor Yellow
Write-Host "   - Check WiFi network names match" -ForegroundColor Yellow
Write-Host "   - Try temporarily disabling Windows Firewall" -ForegroundColor Yellow
Write-Host "   - Check router settings (AP Isolation might be enabled)" -ForegroundColor Yellow
Write-Host ""
Write-Host "API URL in mobile app should be: http://$mainIP:5000/api" -ForegroundColor Cyan
Write-Host ""
pause

