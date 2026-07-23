$backupDir = "D:\jadi\saas\inventory system\backups"
if (!(Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
Copy-Item "D:\jadi\saas\inventory system\index.html" -Destination "$backupDir\index.html.$timestamp.bak" -Force
Write-Host "Backup created: $backupDir\index.html.$timestamp.bak"
