# PowerShell script to add firewall rule for Node.js backend
# Run this script as Administrator

Write-Host "Adding Windows Firewall rule for Node.js backend on port 5000..." -ForegroundColor Yellow

# Add firewall rule
netsh advfirewall firewall add rule name="Node.js Backend Port 5000" dir=in action=allow protocol=TCP localport=5000

if ($LASTEXITCODE -eq 0) {
    Write-Host "Firewall rule added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your backend should now be accessible from your phone." -ForegroundColor Green
    Write-Host "Test it by opening this URL on your phone's browser:" -ForegroundColor Cyan
    Write-Host "http://192.168.8.163:5000/api/health" -ForegroundColor White
} else {
    Write-Host "Failed to add firewall rule. Please run PowerShell as Administrator." -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Navigate to backend folder" -ForegroundColor Yellow
    Write-Host "4. Run: .\fix-firewall.ps1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

