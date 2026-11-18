#Requires -Version 5.1
# Build the showcase React dashboard with base=/app/ and deploy it to the phone
# (steam.zhili-he.top/app/ — data is nginx-aliased to the live dashboard.json).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File deploy-showcase.ps1
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$mssh = 'C:\Users\Gigg1ty\mi-ai\mssh.py'

# 1) build with /app/ base into dist-app
Push-Location (Join-Path $repoRoot 'web')
npx vite build --base=/app/ --outDir dist-app --emptyOutDir 2>&1 | Select-Object -Last 3
Pop-Location
if ($LASTEXITCODE -ne 0) { Write-Error 'vite build failed' }

# 2) also ship the matrix terminal page (kept in sync from web/terminal)
Copy-Item (Join-Path $repoRoot 'web\terminal\index.html') (Join-Path $repoRoot 'phone\steam-collector\terminal-index.html') -Force

# 3) tar + push
$tarLocal = Join-Path $env:TEMP 'steam-showcase.tgz'
if (Test-Path $tarLocal) { Remove-Item $tarLocal -Force }
tar -czf $tarLocal -C (Join-Path $repoRoot 'web') dist-app
tar -czf (Join-Path $env:TEMP 'steam-terminal.tgz') -C (Join-Path $repoRoot 'phone\steam-collector') terminal-index.html
Write-Host "packed dist-app $((Get-Item $tarLocal).Length) bytes"
python $mssh --put $tarLocal /data/data/com.termux/files/usr/tmp/steam-showcase.tgz
python $mssh --put (Join-Path $env:TEMP 'steam-terminal.tgz') /data/data/com.termux/files/usr/tmp/steam-terminal.tgz
python $mssh --put (Join-Path $repoRoot 'phone\steam-collector\terminal-index.html') /data/data/com.termux/files/usr/tmp/terminal-index.html

# 4) install inside proot (staging bound to /tmp via --shared-tmp)
python $mssh "proot-distro login debian --shared-tmp -- /bin/bash -c 'rm -rf /root/steam-notes/www-app/app && mkdir -p /root/steam-notes/www-app/app && tar -xzf /tmp/steam-showcase.tgz -C /tmp && cp -r /tmp/dist-app/* /root/steam-notes/www-app/app/ && tar -xzf /tmp/steam-terminal.tgz -C /tmp && cp /tmp/terminal-index.html /root/steam-notes/www-app/index.html && ls /root/steam-notes/www-app/app | head -5'"
Write-Host "deploy-showcase done. Public URL: https://steam.zhili-he.top/app/"
