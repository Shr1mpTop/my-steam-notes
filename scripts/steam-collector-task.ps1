#Requires -Version 5.1
<#.SYNOPSIS Steam Notebook data collector — fetches fresh Steam API data, builds dashboard.json, commits and pushes.
    Designed to run every 30 min via Windows Task Scheduler.
    NOTE: keep PowerShell 5.1 compatible — Join-Path here takes only TWO positional args
    (the 3-arg overload is PowerShell 7+ and silently breaks logging under powershell.exe).
#>
$ErrorActionPreference = 'Continue'
$repo    = 'E:\github\my-steam-notes'
$scripts = Join-Path $repo 'scripts'
$dataDir = Join-Path $repo 'data'
$log     = Join-Path $scripts 'collector.log'
$python  = 'C:\Users\Gigg1ty\AppData\Local\Programs\Python\Python314\python.exe'

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $log -Value "[$ts] $msg" -Encoding UTF8
}

function TailOf($out) {
    (($out | Select-Object -Last 4 | ForEach-Object { "$_" }) -join ' | ')
}

Log "=== collector start ==="

# env for Steam API + local SQLite — secrets live in gitignored scripts\collector.env
$envFile = Join-Path $scripts 'collector.env'
if (-not (Test-Path $envFile)) { Log "collector.env MISSING (STEAM_API_KEY/STEAM_ID)"; exit 1 }
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
        $k, $v = $line -split '=', 2
        Set-Item -Path "env:$($k.Trim())" -Value $v.Trim()
    }
}
$env:STEAM_DB_MODE = "local"
$env:STEAM_DB_PATH = Join-Path $dataDir 'fresh.db'
$env:TURSO_URL = ""
$env:TURSO_TOKEN = ""
$env:PYTHONPATH = $repo

$failed = $false

# 1) ensure social tables exist
& $python (Join-Path $scripts '_init_fresh_tables.py') 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Log "init tables FAILED exit=$LASTEXITCODE"; $failed = $true } else { Log "init tables OK" }

# 2) sync fresh data from Steam API
$out = & $python (Join-Path $scripts 'sync_realtime.py') 2>&1
if ($LASTEXITCODE -ne 0) { Log "sync FAILED exit=$LASTEXITCODE :: $(TailOf $out)"; $failed = $true } else { Log "sync OK" }

# 3) poll own + friends presence (feeds the 24x7 heat map and FRIEND HEAT panel)
$out = & $python (Join-Path $scripts 'poll_status.py') 2>&1
if ($LASTEXITCODE -ne 0) { Log "poll FAILED exit=$LASTEXITCODE :: $(TailOf $out)"; $failed = $true } else { Log "poll OK" }

# 4) build dashboard.json
$out = & $python (Join-Path $scripts 'build_dashboard.py') 2>&1
if ($LASTEXITCODE -ne 0) { Log "build FAILED exit=$LASTEXITCODE :: $(TailOf $out)"; $failed = $true } else { Log "build OK" }

if ($failed) {
    Log "=== collector end: FAILED (push skipped) ==="
    exit 1
}

# 5) commit + push (only when dashboard.json actually changed)
Set-Location $repo
# self-heal non-fast-forward: rebase onto origin/main; autoStash keeps the
# main working tree's unrelated dirty files (parallel web edits) untouched
git -c rebase.autoStash=true -c http.proxy=http://127.0.0.1:7897 pull --rebase origin main 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Log "pull --rebase FAILED :: non-fast-forward not healable, retry next run"; exit 1 }
git add data/dashboard.json 2>&1 | Out-Null
$staged = git diff --cached --name-only
if ($staged -match "dashboard") {
    git commit -m "data: auto $(Get-Date -Format 'MM-dd HH:mm')" 2>&1 | Out-Null
    $pushOut = git -c http.proxy=http://127.0.0.1:7897 push origin main 2>&1
    if ($LASTEXITCODE -eq 0) {
        Log "pushed OK"
    } else {
        Log "push FAILED :: $(TailOf $pushOut)"
        Log "=== collector end: FAILED (push) ==="
        exit 1
    }
} else {
    Log "dashboard unchanged"
}

Log "=== collector end: OK ==="
