# Run a Lectrax k6 scenario (Windows PowerShell).
# Usage: .\loadtests\k6\run.ps1 -Scenario 01-smoke -Scale 100
param(
  [string]$Scenario = "01-smoke",
  [int]$Scale = 100
)

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $Root ".env"
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $pair = $_.Split('=', 2)
    if ($pair.Length -eq 2) {
      $name = $pair[0].Trim()
      $val = $pair[1].Trim().Trim('"').Trim("'")
      if (-not [string]::IsNullOrEmpty($name)) {
        Set-Item -Path "Env:$name" -Value $val
      }
    }
  }
}

$env:SCALE = "$Scale"
if (-not $env:BASE_URL) { $env:BASE_URL = "http://localhost:3000" }

$Script = Join-Path $Root "scenarios\$Scenario.js"
if (-not (Test-Path $Script)) {
  $match = Get-ChildItem (Join-Path $Root "scenarios") -Filter "*$Scenario*.js" | Select-Object -First 1
  if (-not $match) { throw "Unknown scenario: $Scenario" }
  $Script = $match.FullName
}

$Results = Join-Path $Root "results"
New-Item -ItemType Directory -Force -Path $Results | Out-Null
$Out = Join-Path $Results ("{0}-scale{1}-{2}.json" -f $Scenario, $Scale, (Get-Date -Format "yyyyMMddHHmmss"))

Write-Host "==> k6 run $Script (SCALE=$Scale BASE_URL=$($env:BASE_URL))"
k6 run `
  -e "BASE_URL=$($env:BASE_URL)" `
  -e "SCALE=$Scale" `
  -e "THRESHOLD_PROFILE=$($env:THRESHOLD_PROFILE)" `
  -e "ALLOW_RATE_LIMITS=$($env:ALLOW_RATE_LIMITS)" `
  -e "USERS_FILE=$($env:USERS_FILE)" `
  -e "LECTURER_IDENTIFIER=$($env:LECTURER_IDENTIFIER)" `
  -e "LECTURER_PASSWORD=$($env:LECTURER_PASSWORD)" `
  -e "CLASS_SESSION_ID=$($env:CLASS_SESSION_ID)" `
  -e "ASSIGNMENT_ID=$($env:ASSIGNMENT_ID)" `
  -e "TEST_ID=$($env:TEST_ID)" `
  -e "ENROLLMENT_IDS=$($env:ENROLLMENT_IDS)" `
  -e "TOKEN_FEED_URL=$($env:TOKEN_FEED_URL)" `
  -e "QR_TOKEN=$($env:QR_TOKEN)" `
  -e "ATTENDANCE_SESSION_ID=$($env:ATTENDANCE_SESSION_ID)" `
  -e "PAYMENT_DRY_RUN=$($env:PAYMENT_DRY_RUN)" `
  -e "ALLOW_DISTRIBUTED_SCALE=$($env:ALLOW_DISTRIBUTED_SCALE)" `
  -e "RUN_EXPORT=$($env:RUN_EXPORT)" `
  --out "json=$Out" `
  $Script
