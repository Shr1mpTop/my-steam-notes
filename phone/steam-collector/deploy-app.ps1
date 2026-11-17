#Requires -Version 5.1
# Build the dashboard with base=/ and deploy to the phone (steam.zhili-he.top).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File deploy-app.ps1
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$mssh = 'C:\Users\Gigg1ty\mi-ai\mssh.py'

# 1) build with root-relative base into a separate out dir
Push-Location (Join-Path $repoRoot 'web')
npx vite build --base=/ --outDir dist-phone --emptyOutDir 2>&1 | Select-Object -Last 4
Pop-Location
if ($LASTEXITCODE -ne 0) { Write-Error 'vite build failed' }

# 2) tar + push + extract into /root/steam-notes/www-app
$tarLocal = Join-Path $env:TEMP 'steam-app-dist.tgz'
if (Test-Path $tarLocal) { Remove-Item $tarLocal -Force }
tar -czf $tarLocal -C (Join-Path $repoRoot 'web') dist-phone
Write-Host "packed dist ($((Get-Item $tarLocal).Length) bytes)"
python $mssh --put $tarLocal /data/data/com.termux/files/usr/tmp/steam-app-dist.tgz

# 3) install inside proot (staging = Termux $PREFIX/tmp, bound to /tmp via --shared-tmp)
python $mssh "proot-distro login debian --shared-tmp -- /bin/bash -c 'rm -rf /root/steam-notes/www-app && mkdir -p /root/steam-notes/www-app && tar -xzf /tmp/steam-app-dist.tgz -C /tmp && cp -r /tmp/dist-phone/* /root/steam-notes/www-app/ && ls /root/steam-notes/www-app | head -5'"
python $mssh "proot-distro login debian --shared-tmp -- curl -s -o /dev/null -w 'local 8082 http=%{http_code}\n' http://127.0.0.1:8082/"
Write-Host "deploy-app done. If public 502/404: restart Cloudflared service (admin) so the new ingress rule loads."
