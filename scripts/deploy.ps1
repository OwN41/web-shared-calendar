<#
  Builds the app and the Android APK, then runs the production server.
  Usage: powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 [-SkipApk] [-NoStart] [-Port 3000]
         [-DatabaseUrl URL] [-ServerUrl URL]
  DATABASE_URL and CAP_SERVER_URL come from setup.ps1 via .env.local; -DatabaseUrl and
  -ServerUrl overwrite them there.
  Missing Node.js/PostgreSQL are installed through setup.ps1; a missing JDK 21 (winget) and
  Android SDK (command-line tools) are installed when the APK is built.
  The APK needs CAP_SERVER_URL in .env.local.
#>
param(
  [switch]$SkipApk,
  [switch]$NoStart,
  [int]$Port = 3000,
  [string]$DatabaseUrl = "",
  [string]$ServerUrl = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Run($label, [scriptblock]$cmd) {
  & $cmd
  if ($LASTEXITCODE -ne 0) { throw "$label failed." }
}
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [Environment]::GetEnvironmentVariable("Path", "User")
}
function Java-Ok {
  if (-not (Has java)) { return $false }
  $line = (& cmd /c "java -version 2>&1" | Select-Object -First 1)
  if ($line -match '"(\d+)') { return ([int]$Matches[1] -ge 17 -and [int]$Matches[1] -le 21) }
  return $false
}
function Install-Jdk {
  if (-not (Has winget)) { throw "winget not found. Install JDK 17-21 manually." }
  winget install --id EclipseAdoptium.Temurin.21.JDK -e --silent --accept-package-agreements --accept-source-agreements
  Refresh-Path
  $jdk = Get-ChildItem "$env:ProgramFiles\Eclipse Adoptium\jdk-21*" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($jdk) { $env:JAVA_HOME = $jdk.FullName; $env:Path = "$($jdk.FullName)\bin;$env:Path" }
}
function Install-AndroidSdk {
  $sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
  $sdkmanager = Join-Path $sdk "cmdline-tools\latest\bin\sdkmanager.bat"
  if (-not (Test-Path $sdkmanager)) {
    $zip = Join-Path $env:TEMP "cmdline-tools.zip"
    $tmp = Join-Path $env:TEMP "cmdline-tools-extract"
    Invoke-WebRequest "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile $zip
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Expand-Archive $zip -DestinationPath $tmp
    New-Item -ItemType Directory -Force (Join-Path $sdk "cmdline-tools") | Out-Null
    $latest = Join-Path $sdk "cmdline-tools\latest"
    if (Test-Path $latest) { Remove-Item $latest -Recurse -Force }
    Move-Item (Join-Path $tmp "cmdline-tools") $latest
    Remove-Item $zip, $tmp -Recurse -Force
  }
  (1..30 | ForEach-Object { "y" }) | & $sdkmanager "--sdk_root=$sdk" --licenses | Out-Null
  & $sdkmanager "--sdk_root=$sdk" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
  if ($LASTEXITCODE -ne 0) { throw "sdkmanager failed." }
  $env:ANDROID_HOME = $sdk
  # Gradle reads the SDK location from local.properties
  $escaped = $sdk -replace '\\', '\\' -replace ':', '\:'
  Set-Content (Join-Path "android" "local.properties") "sdk.dir=$escaped"
}

# Node.js, PostgreSQL, database and .env.local are handled by setup.ps1
$nodeOk = (Has node) -and ([int](node -p "process.versions.node.split('.')[0]") -ge 20)
$psqlOk = (Has psql) -or (Test-Path "$env:ProgramFiles\PostgreSQL\*\bin\psql.exe")
if (-not $nodeOk -or -not $psqlOk -or -not (Test-Path .env.local)) {
  Step "Missing base dependencies, running setup.ps1"
  & (Join-Path $PSScriptRoot "setup.ps1")
  Refresh-Path
}

function Set-EnvValue($name, $value) {
  $found = $false
  $lines = @(Get-Content .env.local | ForEach-Object {
    if ($_ -match "^#?\s*$name=" -and -not $found) { $found = $true; "$name=$value" } else { $_ }
  })
  if (-not $found) { $lines += "$name=$value" }
  Set-Content .env.local $lines
}
# Values from setup.ps1 are already in .env.local; parameters overwrite them
if ($DatabaseUrl) { Set-EnvValue "DATABASE_URL" $DatabaseUrl; Write-Host "DATABASE_URL updated in .env.local" }
if ($ServerUrl) { Set-EnvValue "CAP_SERVER_URL" $ServerUrl; Write-Host "CAP_SERVER_URL updated in .env.local" }

foreach ($file in @(".env", ".env.local")) {
  if (Test-Path $file) { Get-Content $file | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim().Trim('"', "'"))
    } } }
}
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is not set (.env.local). Run scripts\setup.ps1 first." }

Step "Dependencies"
Run "npm install" { npm install }

Step "Prisma client + migrations"
Run "prisma generate" { npx prisma generate }
Run "migrations" { npm run db:migrate }

if (-not $SkipApk) {
  Step "Android APK"
  try {
    if (-not $env:CAP_SERVER_URL) { throw "CAP_SERVER_URL is not set in .env.local." }
    if (-not (Java-Ok)) { Step "Installing JDK 21"; Install-Jdk }
    if (-not (Java-Ok)) { throw "JDK 17-21 is required. Set JAVA_HOME / PATH." }
    $props = Join-Path "android" "local.properties"
    if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT -and
        -not ((Test-Path $props) -and (Select-String -Path $props -Pattern '^sdk\.dir=' -Quiet))) {
      Step "Installing Android SDK"; Install-AndroidSdk
    }
    Run "cap sync" { npm run cap:sync }
    Push-Location android
    try { Run "gradle" { .\gradlew.bat assembleDebug } } finally { Pop-Location }
    New-Item -ItemType Directory -Force downloads | Out-Null
    Copy-Item android\app\build\outputs\apk\debug\app-debug.apk downloads\family-calendar.apk -Force
    Write-Host "APK copied to downloads\family-calendar.apk"
  } catch {
    Write-Warning "APK build skipped: $($_.Exception.Message)"
  }
}

Step "Building the app"
Run "next build" { npm run build }

if ($NoStart) { Write-Host "`nBuild finished. Start with: npm start -- -H 0.0.0.0 -p $Port"; exit 0 }

Step "Starting production server on port $Port (Ctrl+C to stop)"
npm start -- -H 0.0.0.0 -p $Port
