# Speeds up Next.js local dev on Windows by excluding Lectrax from Defender scans.
# Official guidance: https://nextjs.org/docs/app/guides/local-development
#
# Run once in an elevated PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\scripts\fix-slow-filesystem.ps1

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$cacheRoot = Join-Path $env:LOCALAPPDATA "lectrax"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  Write-Host "Re-launching elevated so Defender exclusions can be added..." -ForegroundColor Yellow
  $args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $PSCommandPath
  )
  Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $args | Out-Null
  exit 0
}

$paths = @($projectRoot, $cacheRoot) | Select-Object -Unique

foreach ($path in $paths) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
  Add-MpPreference -ExclusionPath $path
  Write-Host "Added Defender exclusion: $path" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Restart the Next.js dev server (npm run dev)." -ForegroundColor Green
Write-Host "The 'Slow filesystem detected' warning should clear after a fresh start." -ForegroundColor Green
