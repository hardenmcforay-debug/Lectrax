# Lectrax — Windows setup helper
# Run in PowerShell: .\scripts\setup-windows.ps1

$ErrorActionPreference = "Stop"
$nodeDir = "${env:ProgramFiles}\nodejs"

function Test-NodeReady {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) { return $true }
    if (Test-Path "$nodeDir\npm.cmd") { return $true }
    return $false
}

function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

Write-Host "Lectrax Windows Setup" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-NodeReady)) {
    Write-Host "Node.js is not installed (npm is missing)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option A — winget (recommended):" -ForegroundColor Green
    Write-Host '  winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements'
    Write-Host "  Approve the UAC prompt when Windows asks for administrator permission."
    Write-Host ""
    Write-Host "Option B — manual download:" -ForegroundColor Green
    Write-Host "  https://nodejs.org/en/download/  (choose Windows Installer .msi LTS)"
    Write-Host ""
    Write-Host "After installing, CLOSE this terminal, open a NEW PowerShell window, then run:"
    Write-Host "  cd `"$PSScriptRoot\..`""
    Write-Host "  npm install"
    Write-Host "  npm run dev"
    Write-Host ""

    $install = Read-Host "Install Node.js now with winget? (y/n)"
    if ($install -eq "y") {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        Refresh-Path
    } else {
        exit 1
    }
}

Refresh-Path

$npmCmd = if (Get-Command npm -ErrorAction SilentlyContinue) {
    "npm"
} else {
    "$nodeDir\npm.cmd"
}

Write-Host "Node version:" -ForegroundColor Cyan
& "$nodeDir\node.exe" --version 2>$null
if (-not $?) { node --version }

Write-Host "npm version:" -ForegroundColor Cyan
& $npmCmd --version

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

if (-not (Test-Path ".env.local")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-Host "Created .env.local from .env.example — fill in your Supabase keys." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan
& $npmCmd install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done! Start the dev server with: npm run dev" -ForegroundColor Green
} else {
    Write-Host "npm install failed. Try again in a new terminal after Node.js is installed." -ForegroundColor Red
    exit $LASTEXITCODE
}
