#!/usr/bin/env bash
# Sets up web-shared-calendar on Debian/Ubuntu, Fedora/RHEL, Arch or macOS (Homebrew):
# installs Node.js 20+ and PostgreSQL if missing, creates the database and .env.local,
# installs npm packages and applies the Prisma migrations.
# Usage: DB_PASSWORD=secret ./scripts/setup.sh   (DB_NAME, DB_USER, DB_HOST, DB_PORT optional)
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME="${DB_NAME:-shared_calendar}"
DB_USER="${DB_USER:-calendar}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
SERVER_URL="${SERVER_URL:-}"   # default: http://<detected IP>:APP_PORT
APP_PORT="${APP_PORT:-3000}"

step() { printf '\n==> %s\n' "$*"; }
has() { command -v "$1" >/dev/null 2>&1; }
SUDO=""; [ "$(id -u)" -ne 0 ] && has sudo && SUDO="sudo"

if [ -z "$DB_PASSWORD" ]; then
  read -r -s -p "Password for database user '$DB_USER': " DB_PASSWORD; echo
fi
case "$DB_PASSWORD" in *"'"*) echo "Password must not contain a single quote." >&2; exit 1;; esac

node_ok() { has node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; }

step "Node.js"
if ! node_ok; then
  if has apt-get; then
    $SUDO apt-get update
    $SUDO apt-get install -y curl ca-certificates
    curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
    $SUDO apt-get install -y nodejs
  elif has dnf; then $SUDO dnf install -y nodejs npm
  elif has pacman; then $SUDO pacman -S --noconfirm nodejs npm
  elif has brew; then brew install node
  else echo "Unsupported system: install Node.js 20+ manually." >&2; exit 1; fi
fi
node_ok || { echo "Node.js 20+ is required." >&2; exit 1; }
echo "node $(node -v), npm $(npm -v)"

step "PostgreSQL"
if ! has psql; then
  if has apt-get; then $SUDO apt-get install -y postgresql postgresql-contrib
  elif has dnf; then $SUDO dnf install -y postgresql-server postgresql-contrib
  elif has pacman; then $SUDO pacman -S --noconfirm postgresql
  elif has brew; then brew install postgresql@17
  else echo "Unsupported system: install PostgreSQL manually." >&2; exit 1; fi
fi

if has brew && [ "$(uname)" = "Darwin" ]; then
  brew services start postgresql@17 >/dev/null 2>&1 || true
  sleep 3
  run_sql() { psql -d postgres -v ON_ERROR_STOP=1 "$@"; }
else
  if has dnf && [ ! -d /var/lib/pgsql/data/base ]; then $SUDO postgresql-setup --initdb; fi
  if has pacman && [ ! -d /var/lib/postgres/data/base ]; then
    $SUDO -u postgres initdb -D /var/lib/postgres/data
  fi
  if has systemctl; then $SUDO systemctl enable --now postgresql; sleep 2; fi
  run_sql() { (cd /tmp && $SUDO -u postgres psql -v ON_ERROR_STOP=1 "$@"); }
fi

step "Database role and database"
role_exists="$(run_sql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")"
if [ "$role_exists" != "1" ]; then
  run_sql -c "CREATE ROLE \"$DB_USER\" LOGIN CREATEDB PASSWORD '$DB_PASSWORD';"
else
  run_sql -c "ALTER ROLE \"$DB_USER\" WITH LOGIN CREATEDB PASSWORD '$DB_PASSWORD';"
fi
if [ "$(run_sql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")" != "1" ]; then
  run_sql -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"
else
  run_sql -c "ALTER DATABASE \"$DB_NAME\" OWNER TO \"$DB_USER\";"
fi
run_sql -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";"
run_sql -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO \"$DB_USER\";"
run_sql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO \"$DB_USER\";"

# Fedora/RHEL default to ident auth on TCP, which rejects password logins
if has dnf && [ -f /var/lib/pgsql/data/pg_hba.conf ]; then
  $SUDO sed -i -E 's/^(host\s+all\s+all\s+(127\.0\.0\.1\/32|::1\/128)\s+)ident/\1scram-sha-256/' /var/lib/pgsql/data/pg_hba.conf
  run_sql -c "SELECT pg_reload_conf();" >/dev/null
fi

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1" >/dev/null \
  || { echo "Login as '$DB_USER' failed (check pg_hba.conf password authentication)." >&2; exit 1; }
echo "login as '$DB_USER' works"

step ".env.local"
ENC_PW="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$DB_PASSWORD")"
URL="postgresql://${DB_USER}:${ENC_PW}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
[ -f .env.local ] || cp .env.example .env.local

set_env() { # name value: replaces (or un-comments) the line, appends if missing
  node -e '
    const fs = require("fs");
    const [name, value] = process.argv.slice(1);
    const lines = fs.readFileSync(".env.local", "utf8").split(/\r?\n/);
    const re = new RegExp("^#?\\s*" + name + "=");
    const i = lines.findIndex((l) => re.test(l));
    if (i >= 0) lines[i] = name + "=" + value; else lines.push(name + "=" + value);
    fs.writeFileSync(".env.local", lines.join("\n").replace(/\n*$/, "\n"));' "$1" "$2"
}

if [ -z "$SERVER_URL" ]; then
  ip=""
  if has ip; then ip="$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -n1)"; fi
  [ -n "$ip" ] || ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  [ -n "$ip" ] || ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
  if [ -n "$ip" ]; then SERVER_URL="http://$ip:$APP_PORT"
  else echo "Could not detect the server IP; keeping CAP_SERVER_URL as is (set SERVER_URL=http://<ip>:$APP_PORT)."; fi
fi
set_env DATABASE_URL "$URL"
[ -n "$SERVER_URL" ] && set_env CAP_SERVER_URL "$SERVER_URL"
echo "DATABASE_URL and CAP_SERVER_URL written to .env.local"

step "npm install"
npm install

step "Prisma client + migrations (creates the tables)"
export DATABASE_URL="$URL"
npx prisma generate
npm run db:migrate

step "Done"
echo "Start the app with: npm run dev  (http://localhost:3000, first registered user becomes admin)"
