import type { CapacitorConfig } from '@capacitor/cli';

// The app is server-rendered (Next.js + Postgres), so the native shell loads
// the deployed site. Set CAP_SERVER_URL (e.g. https://calendar.example.com, or
// http://<your-LAN-IP>:3000 for development) before running `npm run cap:sync`.
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'home.familycalendar',
  appName: 'Family Calendar',
  webDir: 'public',
  server: serverUrl
    ? { url: serverUrl, cleartext: serverUrl.startsWith('http://') }
    : undefined,
};

export default config;
