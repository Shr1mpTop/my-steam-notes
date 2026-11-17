#Requires -Version 5.1
# Deploy my-steam-notes collector to the M11P phone server.
# Usage:  powershell -NoProfile -ExecutionPolicy Bypass -File deploy.ps1 [-FreshDb]
#   -FreshDb : also push the local steam.db (first install / intentional restore).
#              A live db with data on the phone is NEVER overwritten by redeploys.
# Secrets: put them in phone\steam-collector\.env (gitignored) BEFORE running.
param([switch]$FreshDb)
$ErrorActionPreference = 'Stop'

$repoRoot   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # phone\steam-collector -> repo
$mssh       = 'C:\Users\Gigg1ty\mi-ai\mssh.py'
# 2026-11-18 doctrine: NO /sdcard anywhere - staging lives in Termux $PREFIX/tmp
# (app-private, survives storage-permission revocation) which --shared-tmp binds
# into proot as /tmp, so both Termux and proot see the same files.
$stage      = '/data/data/com.termux/files/usr/tmp/steam-notes-staging'
$tarRemote  = '/data/data/com.termux/files/usr/tmp/steam-notes-deploy.tgz'
$shRemote   = '/data/data/com.termux/files/usr/tmp/steam-notes-install.sh'
$shInProot  = '/tmp/steam-notes-install.sh'

$envFile = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path $envFile)) {
    Write-Warning "No .env at $envFile - deploy will run but collector exits(2) until secrets land."
}

# 0) fresh remote staging dir
python $mssh "rm -rf $stage && mkdir -p $stage"

# 1) tar the repo pieces (Windows bsdtar)
$tarLocal = Join-Path $env:TEMP 'steam-notes-deploy.tgz'
if (Test-Path $tarLocal) { Remove-Item $tarLocal -Force }
tar -czf $tarLocal -C $repoRoot --exclude '.env' --exclude 'steam.db' --exclude 'steam.db-wal' --exclude 'steam.db-shm' scripts phone
Write-Host "packed $tarLocal ($((Get-Item $tarLocal).Length) bytes)"

# 2) push artifacts
python $mssh --put $tarLocal $tarRemote
if (Test-Path $envFile) { python $mssh --put $envFile "$stage/env" }
$dbLocal = Join-Path $PSScriptRoot 'steam.db'
if ($FreshDb -and (Test-Path $dbLocal)) { python $mssh --put $dbLocal "$stage/steam.db" }
python $mssh --put (Join-Path $PSScriptRoot 'install-inner.sh') $shRemote

# 3) extract + de-CRLF the installer + run it inside proot
python $mssh "tar -xzf $tarRemote -C $stage"
python $mssh "sed -i 's/\r$//' $shRemote"
python $mssh "proot-distro login debian --shared-tmp -- bash $shInProot"

Write-Host "`nDeploy done. Verify:"
Write-Host "  python $mssh `"proot-distro login debian --shared-tmp -- timeout 20 supervisorctl status`""
Write-Host "  curl http://192.168.0.104:8081/files/steam/dashboard.json"
