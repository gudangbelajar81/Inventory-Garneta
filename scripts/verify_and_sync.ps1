$ErrorActionPreference = "Stop"
Write-Host "🔍 Extracting JavaScript for Syntax Check..."
$html = Get-Content "D:\jadi\saas\inventory system\index.html" -Raw -Encoding UTF8
$scripts = [regex]::Matches($html, '(?s)<script>(.*?)</script>')
$jsCode = ""
foreach ($match in $scripts) {
    $jsCode += $match.Groups[1].Value + "
"
}
Set-Content "D:\jadi\saas\inventory system\temp_syntax_check.js" -Value $jsCode -Encoding UTF8

Write-Host "🔬 Running Node.js Compiler Check..."
try {
    # Run node -c and capture errors
    $process = Start-Process node -ArgumentList "-c", '"D:\jadi\saas\inventory system\temp_syntax_check.js"' -Wait -NoNewWindow -PassThru -ErrorAction Stop
    if ($process.ExitCode -ne 0) {
        throw "Node.js syntax check failed with exit code $($process.ExitCode)"
    }
    
    Write-Host "✅ Syntax Check PASSED! Bumping Service Worker..."
    
    # Bump Service Worker
    $swPath = "D:\jadi\saas\inventory system\service-worker.js"
    $swContent = Get-Content $swPath -Raw -Encoding UTF8
    
    # Extract current version and increment
    if ($swContent -match 'inventory-pwa-v(\d+)') {
        $currentVersion = [int]$matches[1]
        $nextVersion = $currentVersion + 1
        $swContent = $swContent -replace "inventory-pwa-v$currentVersion", "inventory-pwa-v$nextVersion"
        Set-Content -Path $swPath -Value $swContent -Encoding UTF8
        Write-Host "🚀 Service Worker bumped to v$nextVersion"
    }
    
    Write-Host "🔄 Syncing to MASTER folder..."
    Copy-Item "D:\jadi\saas\inventory system\index.html" -Destination "D:\JADI MASTER\inventory system\index.html" -Force
    Copy-Item "D:\jadi\saas\inventory system\service-worker.js" -Destination "D:\JADI MASTER\inventory system\service-worker.js" -Force
    Write-Host "🎉 UPDATE SUCCESSFUL & SECURED!"
    
} catch {
    Write-Host "❌ SYNTAX ERROR DETECTED!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    Write-Host "⏪ INITIATING AUTO-ROLLBACK..." -ForegroundColor Yellow
    $backupDir = "D:\jadi\saas\inventory system\backups"
    $latestBackup = Get-ChildItem -Path $backupDir -Filter "*.bak" | Sort-Object CreationTime -Descending | Select-Object -First 1
    
    if ($latestBackup) {
        Copy-Item $latestBackup.FullName -Destination "D:\jadi\saas\inventory system\index.html" -Force
        Write-Host "🛡️ ROLLBACK SUCCESSFUL! Restored from $($latestBackup.Name)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ NO BACKUP FOUND! Cannot rollback." -ForegroundColor Red
    }
    exit 1
} finally {
    if (Test-Path "D:\jadi\saas\inventory system\temp_syntax_check.js") {
        Remove-Item "D:\jadi\saas\inventory system\temp_syntax_check.js" -Force
    }
}

