# Start Lectrax dev server (fixes "npm is not recognized" when PATH is stale)
$nodeDir = "${env:ProgramFiles}\nodejs"
if (Test-Path $nodeDir) {
    $env:Path = "$nodeDir;" + [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js/npm not found. Install from https://nodejs.org/ then restart PowerShell." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "node_modules\next\package.json")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting Lectrax at http://localhost:3000" -ForegroundColor Green
npm run dev
