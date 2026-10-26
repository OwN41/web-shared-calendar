#!/usr/bin/env bash
# Builds the app and the Android APK, then runs the production server.
# Usage: bash scripts/deploy.sh [--skip-apk] [--no-start] [--database-url=URL] [--server-url=URL]
# (PORT=3000 optional). DATABASE_URL and CAP_SERVER_URL come from setup.sh via .env.local;
# the two --*-url options overwrite them there.
# Missing Node.js/PostgreSQL are installed through setup.sh; a missing JDK 21 and
# Android SDK (command-line tools) are installed when the APK is built.
# The APK needs CAP_SERVER_URL in .env.local.
set -euo pipefail
cd "$(dirname "$0")/.."

SKIP_APK=0; NO_START=0; PORT="${PORT:-3000}"
for arg in "$@"; do
  case "$arg" in
    --skip-apk) SKIP_APK=1;;
    --no-start) NO_START=1;;
    --database-url=*) NEW_DATABASE_URL="${arg#*=}";;
    --server-url=*) NEW_SERVER_URL="${arg#*=}";;
    *) echo "Unknown option: $arg" >&2; exit 1;;
  esac
done
NEW_DATABASE_URL="${NEW_DATABASE_URL:-}"; NEW_SERVER_URL="${NEW_SERVER_URL:-}"

step() { printf '\n==> %s\n' "$*"; }
has() { command -v "$1" >/dev/null 2>&1; }
SUDO=""; [ "$(id -u)" -ne 0 ] && has sudo && SUDO="sudo"

node_ok() { has node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; }

# Node.js and PostgreSQL + database + .env.local are handled by setup.sh
if ! node_ok || ! has psql || [ ! -f .env.local ]; then
  step "Missing base dependencies, running setup.sh"
  bash scripts/setup.sh
fi

set_env() {
  node -e '
    const fs = require("fs");
    const [name, value] = process.argv.slice(1);
    const lines = fs.readFileSync(".env.local", "utf8").split(/\r?\n/);
    const re = new RegExp("^#?\\s*" + name + "=");
    const i = lines.findIndex((l) => re.test(l));
    if (i >= 0) lines[i] = name + "=" + value; else lines.push(name + "=" + value);
    fs.writeFileSync(".env.local", lines.join("\n").replace(/\n*$/, "\n"));' "$1" "$2"
}
# Values from setup.sh are already in .env.local; options override them
[ -z "$NEW_DATABASE_URL" ] || { set_env DATABASE_URL "$NEW_DATABASE_URL"; echo "DATABASE_URL updated in .env.local"; }
[ -z "$NEW_SERVER_URL" ] || { set_env CAP_SERVER_URL "$NEW_SERVER_URL"; echo "CAP_SERVER_URL updated in .env.local"; }

# Parsed instead of sourced: values such as the ICS URL contain ; and &
eval "$(node -e '
  const fs = require("fs");
  for (const f of [".env", ".env.local"]) {
    if (!fs.existsSync(f)) continue;
    for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      const v = m[2].trim().replace(/^(["\x27])(.*)\1$/, "$2");
      console.log("export " + m[1] + "=\x27" + v.replace(/\x27/g, "\x27\\\x27\x27") + "\x27");
    }
  }')"
[ -n "${DATABASE_URL:-}" ] || { echo "DATABASE_URL is not set (.env.local)." >&2; exit 1; }

java_ok() {
  has java && v="$(java -version 2>&1 | sed -n '1s/.*"\([0-9]*\).*/\1/p')" && [ "${v:-0}" -ge 17 ] && [ "${v:-0}" -le 21 ]
}

install_jdk() {
  if has apt-get; then $SUDO apt-get update && $SUDO apt-get install -y openjdk-21-jdk-headless
  elif has dnf; then $SUDO dnf install -y java-21-openjdk-devel
  elif has pacman; then $SUDO pacman -S --noconfirm jdk21-openjdk
  elif has brew; then brew install openjdk@21; export JAVA_HOME="$(brew --prefix openjdk@21)"; export PATH="$JAVA_HOME/bin:$PATH"
  else echo "Install JDK 17-21 manually."; return 1; fi
}

install_android_sdk() {
  local sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
  has unzip || has curl || {
    if has apt-get; then $SUDO apt-get install -y unzip curl
    elif has dnf; then $SUDO dnf install -y unzip curl
    elif has pacman; then $SUDO pacman -S --noconfirm unzip curl; fi
  }
  has unzip || { has apt-get && $SUDO apt-get install -y unzip; } || true
  if [ ! -x "$sdk/cmdline-tools/latest/bin/sdkmanager" ]; then
    local os=linux; [ "$(uname)" = "Darwin" ] && os=mac
    local tmp; tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/tools.zip" "https://dl.google.com/android/repository/commandlinetools-${os}-11076708_latest.zip"
    unzip -q "$tmp/tools.zip" -d "$tmp"
    mkdir -p "$sdk/cmdline-tools"
    rm -rf "$sdk/cmdline-tools/latest"
    mv "$tmp/cmdline-tools" "$sdk/cmdline-tools/latest"
    rm -rf "$tmp"
  fi
  yes | "$sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$sdk" --licenses >/dev/null || true
  "$sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$sdk" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
  export ANDROID_HOME="$sdk"
}

step "Dependencies"
npm install

step "Prisma client + migrations"
npx prisma generate
npm run db:migrate

build_apk() (
  set -e
  [ -n "${CAP_SERVER_URL:-}" ] || { echo "CAP_SERVER_URL is not set in .env.local."; exit 1; }
  java_ok || { step "Installing JDK 21"; install_jdk; }
  java_ok || { echo "JDK 17-21 is required (found a different version). Set JAVA_HOME."; exit 1; }
  if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ] &&
     ! grep -qs '^sdk\.dir=' android/local.properties; then
    step "Installing Android SDK"; install_android_sdk
  fi
  npm run cap:sync
  (cd android && sh ./gradlew assembleDebug)
  mkdir -p downloads
  cp android/app/build/outputs/apk/debug/app-debug.apk downloads/family-calendar.apk
  echo "APK copied to downloads/family-calendar.apk"
)

if [ "$SKIP_APK" -eq 0 ]; then
  step "Android APK"
  build_apk || echo "WARNING: APK build skipped (see above)."
fi

step "Building the app"
npm run build

if [ "$NO_START" -eq 1 ]; then
  echo; echo "Build finished. Start with: npm start -- -H 0.0.0.0 -p $PORT"; exit 0
fi

step "Starting production server on port $PORT (Ctrl+C to stop)"
exec npm start -- -H 0.0.0.0 -p "$PORT"
