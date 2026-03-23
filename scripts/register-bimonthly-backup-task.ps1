$ErrorActionPreference = "Stop"

$workspaceRoot = "C:\Users\david\Desktop\JM Artsteel\Davidex\JM"
$runnerPath = "C:\Users\david\run-safety-backup.cmd"
$taskName = "JMart Safety App Bi-Monthly Backup"
$taskDescription = "Exports Safety App Firebase data to a local archive and Google Drive every two months."

Write-Output "Registered scheduled task: $taskName"
schtasks.exe /Create /F /TN $taskName /TR $runnerPath /SC MONTHLY /M JAN,MAR,MAY,JUL,SEP,NOV /D 1 /ST 09:00 | Out-Null
schtasks.exe /Query /TN $taskName /FO LIST /V
