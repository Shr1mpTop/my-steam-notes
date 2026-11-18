#Requires -Version 5.1
<#.SYNOPSIS Steam Notebook data collector — fetches fresh Steam API data, builds dashboard.json, commits and pushes.
    Designed to run every 30 min via Windows Task Scheduler.
    On failure: logs to logs/collector.log, exits non-zero (Task Scheduler shows last result).
#>
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$log = Join-Path $PSScriptRoot "collector.log"

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $log -Value "[$ts] $msg" -Encoding UTF8
}

Log "=== collector start ==="

# env for Steam API + local SQLite
$env:STEAM_API_KEY = "582140B5E4F194473C5172A2CD04B94A"
$env:STEAM_ID = "76561198367786896"
$env:STEAM_DB_MODE = "local"
$env:STEAM_DB_PATH = Join-Path $repo "data" "fresh.db"
$env:TURSO_URL = ""
$env:TURSO_TOKEN = ""

# 1) ensure social tables exist
try {
    $env:PYTHONPATH = $repo
    python (Join-Path $repo "scripts" "_init_fresh_tables.py") 2>&1 | Out-Null
} catch { Log "init tables: $_" }

# 2) sync fresh data from Steam API
Push-Location $repo
try {
    $syncOutput = python scripts\sync_realtime.py 2>&1
    $syncExit = $LASTEXITCODE
    Log "sync_realtime exit=$syncExit"
    if ($syncOutput -match "error|Error|Traceback") { Log ($syncOutput | Out-String).Substring(0, 300) }
} catch { Log "sync error: $_" }

# 3) build dashboard.json
try {
    $buildOutput = python scripts\build_dashboard.py 2>&1
    $buildExit = $LASTEXITCODE
    Log "build_dashboard exit=$buildExit"
    if ($buildOutput -match "Dashboard written") {
        Log ($buildOutput | Where-Object { $_ -match "Dashboard written" } | Out-String).Trim()
    }
} catch { Log "build error: $_" }

# 4) commit + push (only if dashboard.json changed)
try {
    git add data/dashboard.json 2>&1 | Out-Null
    $diff = git diff --cached --stat -- data/dashboard.json
    if ($diff) {
        git commit -m "data: auto-collect $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Out-Null
        git -c http.proxy=http://127.0.0.1:7897 push origin main 2>&1 | Out-Null
        Log "pushed to main"
    } else {
        Log "dashboard.json unchanged, skip push"
    }
} catch { Log "push error: $_" }

Pop-Location
Log "=== collector end ==="
