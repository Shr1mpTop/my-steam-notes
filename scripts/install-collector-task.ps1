#Requires -Version 5.1
<#.SYNOPSIS Install Steam Notebook PC-side data collector as Windows Scheduled Task (every 30 min).
    Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-collector-task.ps1
#>

$taskName = "SteamNotebookCollector"
$repo = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path (Join-Path $repo "scripts") "steam-collector-task.ps1"

if (-not (Test-Path $scriptPath)) {
    Write-Error "Script not found: $scriptPath"; exit 1
}

# clean up old attempt
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`"" -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
$info = Get-ScheduledTaskInfo -TaskName $taskName
Write-Host "Task '$taskName' registered (every 30 min)."
Write-Host "Next run: $($info.NextRunTime)"
