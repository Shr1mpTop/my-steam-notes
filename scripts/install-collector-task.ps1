#Requires -Version 5.1
<#
.SYNOPSIS
    Steam Notebook - PC-side automated data collector + Pages deployer.
    Runs every 30 minutes via Windows Task Scheduler.
    Fetches fresh data from Steam API -> builds dashboard.json -> commits -> pushes.
    Push triggers deploy.yml -> GitHub Pages auto-updates.
.NOTES
    Install:  powershell -File install-collector-task.ps1
    Remove:   powershell -File install-collector-task.ps1 -Remove
    Run once: powershell -File install-collector-task.ps1 -RunNow
#>
param([switch]$Remove, [switch]$RunNow)

$taskName = "SteamNotebookCollector"
$scriptPath = Join-Path $PSScriptRoot "steam-collector-task.ps1"

if ($Remove) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Task '$taskName' removed."
    exit 0
}

# 1) ensure the collector script exists
if (-not (Test-Path $scriptPath)) {
    Write-Error "steam-collector-task.ps1 not found at $scriptPath"
    exit 1
}

# 2) register scheduled task (every 30 minutes, indefinite)
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Task '$taskName' registered (every 30 min)."

if ($RunNow) {
    Start-ScheduledTask -TaskName $taskName
    Write-Host "Triggered immediate run."
}
