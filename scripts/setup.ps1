<#
  Sets up web-shared-calendar on Windows: installs Node.js and PostgreSQL (via winget)
  if missing, creates the application database user (-DbUser/-DbPassword) with the
  needed privileges and its database, writes .env.local, installs npm packages and
  applies the Prisma migrations. -AdminUser/-AdminPassword is the PostgreSQL superuser
  (a fresh install uses -DbPassword for it as well unless -AdminPassword is given).
  Run from anywhere:  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
  Installing software may need an elevated (administrator) shell.
#>
param(
  [string]$DbName = "shared_calendar",
  [string]$DbUser = "calendar",
  [string]$DbPassword = "",
  [string]$AdminUser = "postgres",
  [string]$AdminPassword = "",
  [string]$DbHost = "localhost",
  [int]$DbPort = 5432,
  [string]$ServerUrl = "",   # default: http://<detected IP>:AppPort
  [int]$AppPort = 3000
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [Environment]::GetEnvironmentVariable("Path", "User")
}
function Winget-Install($id, $extra = @()) {
  if (-not (Has winget)) { throw "winget not found. Install '$id' manually and re-run." }
  winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements @extra
  Refresh-Path
}
function Find-Psql {
  if (Has psql) { return (Get-Command psql).Source }
  $found = Get-ChildItem "$env:ProgramFiles\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
  if ($found) { return $found.FullName }
  return $null
}

# Node.js 20+
Step "Node.js"
$needNode = -not (Has node)
if (-not $needNode) { $needNode = ([int](node -p "process.versions.node.split('.')[0]")) -lt 20 }
if ($needNode) { Winget-Install "OpenJS.NodeJS.LTS" }
if (-not (Has node)) { throw "Node.js is not on PATH. Open a new terminal and re-run." }
Write-Host "node $(node -v), npm $(npm -v)"

# PostgreSQL
Step "PostgreSQL"
function Read-Secret($prompt) {
  $sec = Read-Host $prompt -AsSecureString
  [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}
if (-not $DbPassword) { $DbPassword = Read-Secret "Password for the application database user '$DbUser'" }
if (-not $AdminPassword) { $AdminPassword = $env:PGPASSWORD }

$psql = Find-Psql
if (-not $psql) {
  # A fresh install gets the same password for the postgres admin unless one is given
  if (-not $AdminPassword) { $AdminPassword = $DbPassword }
  Winget-Install "PostgreSQL.PostgreSQL.17" @(
    "--override", "--mode unattended --superpassword $AdminPassword --serverport $DbPort")
  $psql = Find-Psql
}
if (-not $psql) { throw "psql not found after install. Add PostgreSQL's bin folder to PATH and re-run." }
if (-not $AdminPassword) { $AdminPassword = Read-Secret "Password of PostgreSQL admin user '$AdminUser'" }

# Make sure the service is running
Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue |
  Where-Object Status -ne "Running" | ForEach-Object { Start-Service $_.Name }
Start-Sleep -Seconds 2

function Admin-Sql($db, $sql) {
  $env:PGPASSWORD = $AdminPassword
  $out = & $psql -h $DbHost -p $DbPort -U $AdminUser -d $db -v ON_ERROR_STOP=1 -tAc $sql
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL command failed (check admin user, password, host and port): $sql" }
  "$out".Trim()
}
$pw = $DbPassword.Replace("'", "''")

# Application user and database
Step "Database user '$DbUser' and database '$DbName'"
if ((Admin-Sql postgres "SELECT 1 FROM pg_roles WHERE rolname='$DbUser'") -ne "1") {
  [void](Admin-Sql postgres "CREATE ROLE `"$DbUser`" LOGIN CREATEDB PASSWORD '$pw'")
  Write-Host "user created"
} else {
  [void](Admin-Sql postgres "ALTER ROLE `"$DbUser`" WITH LOGIN CREATEDB PASSWORD '$pw'")
  Write-Host "user exists, password and privileges updated"
}
if ((Admin-Sql postgres "SELECT 1 FROM pg_database WHERE datname='$DbName'") -ne "1") {
  [void](Admin-Sql postgres "CREATE DATABASE `"$DbName`" OWNER `"$DbUser`"")
  Write-Host "database created"
} else {
  [void](Admin-Sql postgres "ALTER DATABASE `"$DbName`" OWNER TO `"$DbUser`"")
  Write-Host "database exists, owner set"
}
[void](Admin-Sql postgres "GRANT ALL PRIVILEGES ON DATABASE `"$DbName`" TO `"$DbUser`"")
[void](Admin-Sql $DbName "ALTER SCHEMA public OWNER TO `"$DbUser`"")
[void](Admin-Sql $DbName "GRANT ALL ON SCHEMA public TO `"$DbUser`"")

# Verify that the application user can log in
$env:PGPASSWORD = $DbPassword
& $psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -tAc "SELECT 1" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Login as '$DbUser' failed." }
Write-Host "login as '$DbUser' works"
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

# .env.local
Step ".env.local"
$encPw = [Uri]::EscapeDataString($DbPassword)
$url = "postgresql://${DbUser}:${encPw}@${DbHost}:${DbPort}/${DbName}"
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
function Get-EnvValue($name) {
  $m = Get-Content .env.local | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
  if ($m) { return $m.Substring($name.Length + 1).Trim() }
}
function Set-EnvValue($name, $value) {
  $found = $false
  $lines = @(Get-Content .env.local | ForEach-Object {
    if ($_ -match "^#?\s*$name=" -and -not $found) { $found = $true; "$name=$value" } else { $_ }
  })
  if (-not $found) { $lines += "$name=$value" }
  Set-Content .env.local $lines
}
if (-not $ServerUrl) {
  $cfg = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } | Select-Object -First 1
  $ip = if ($cfg) { $cfg.IPv4Address[0].IPAddress }
  if ($ip) { $ServerUrl = "http://${ip}:$AppPort" }
  else { Write-Warning "Could not detect the server IP; CAP_SERVER_URL left as is (use -ServerUrl http://<ip>:$AppPort)." }
}
Set-EnvValue "DATABASE_URL" $url
if ($ServerUrl) { Set-EnvValue "CAP_SERVER_URL" $ServerUrl }
Write-Host "DATABASE_URL and CAP_SERVER_URL written to .env.local"

# Dependencies + tables
Step "npm install"
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

Step "Prisma client + migrations (creates the tables)"
$env:DATABASE_URL = $url
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed (stop the dev server if it is running)." }
npm run db:migrate
if ($LASTEXITCODE -ne 0) { throw "Migrations failed." }

Step "Done"
Write-Host "Start the app with:  npm run dev   (http://localhost:3000, first registered user becomes admin)"
