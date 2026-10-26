import { existsSync, readFileSync } from 'node:fs';
import type { CapacitorConfig } from '@capacitor/cli';

// The app is server-rendered (Next.js + Postgres), so the native shell loads
// the deployed site. Set CAP_SERVER_URL (e.g. https://calendar.example.com, or
// http://<your-LAN-IP>:3000 for development) in .env.local or the environment
// before running `npm run cap:sync`.
function readEnvFile(): string | undefined {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    const line = readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .find((l) => l.startsWith('CAP_SERVER_URL='));
    if (line) return line.slice('CAP_SERVER_URL='.length).trim().replace(/^["']|["']$/g, '');
  }
}

const serverUrl = process.env.CAP_SERVER_URL || readEnvFile();

const config: CapacitorConfig = {
  appId: 'home.familycalendar',
  appName: 'Family Calendar',
  webDir: 'capacitor-www',
  server: serverUrl
    ? { url: serverUrl, cleartext: serverUrl.startsWith('http://') }
    : undefined,
};

export default config;
