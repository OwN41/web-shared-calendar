# 📅 web-shared-calendar

A shared family calendar. Everyone keeps a personal calendar, can share
appointments with groups, and sees a combined view of what others shared.

## Features

- Registration and login with email and password (login works with email or
  name; the first account becomes admin)
- Month calendar; double-click a day to create an appointment
- Appointments with date/time (24h), all-day switch, location (with address
  suggestions and a Google Maps link), note, own color and repeat
  (daily / weekly / monthly / yearly); appointments can be edited later
- Invitations: invite people you share a group with; they accept or decline,
  and accepted appointments appear in their calendar. Invitees and their
  answers are listed on the appointment
- Reminders: several per appointment (15 min to 1 week presets or a custom
  value), shown in the bell and as local notifications in the mobile app
- Notification bell with a live badge for new invitations and answers
- Groups: share appointments with one or more groups (invite codes can be
  copied); "Shared" page shows what is shared with you
- Admin area for managing users and groups
- Profile settings: name, email, password and calendar color
- English and German (cookie-based, switchable in the header), dark/light theme
- Responsive layout with a side drawer navigation on mobile; touch devices get
  a "New appointment" button instead of double-click; smooth page, menu and
  dropdown animations (disabled with "reduce motion"); the Android back
  button closes the appointment form
- Optional waste collection dates from an ICS feed, with per-type filters
  (a dropdown with colored checkboxes on mobile)
- Offline mode: visited pages are cached and shown read-only when the server or
  database is unreachable, then refreshed automatically when it is back
- Android app (Capacitor) with local reminder notifications, downloadable
  from the login page of your own server

## Tech stack

Next.js 16 (App Router, server actions), React 19, TypeScript, Tailwind CSS 4,
Prisma 6 with PostgreSQL, next-intl. Capacitor wraps the site as an Android/iOS
app (see "Mobile app").

> This Next.js version has breaking changes compared to older releases. See
> `node_modules/next/dist/docs/` before changing framework-level code.

## Requirements

- Node.js 20+
- PostgreSQL 14+ (developed against 18)

## Setup

### Automatic

Installs Node.js and PostgreSQL if missing, creates the database and
`.env.local`, installs packages and applies the migrations:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

```sh
bash scripts/setup.sh   # Debian/Ubuntu, Fedora, Arch
```

### Production build and run

Installs anything that is missing first (Node.js and PostgreSQL via the setup
script, plus JDK 21 and the Android SDK for the APK; may need admin/sudo), then
applies migrations, builds the APK into `downloads/family-calendar.apk`
(skipped with a warning if `CAP_SERVER_URL` is missing or the APK build fails),
builds the app and starts it on `0.0.0.0:3000`. `DATABASE_URL` and
`CAP_SERVER_URL` are taken from `.env.local`, where the setup script wrote the
values you entered; `-DatabaseUrl` / `--database-url=` and `-ServerUrl` /
`--server-url=` overwrite them there. Options: `-SkipApk` /
`--skip-apk`, `-NoStart` / `--no-start`, `-Port` / `PORT`.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
```

```sh
bash scripts/deploy.sh
```

### Manual

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create the database (once):

   ```sh
   psql -U postgres -c "CREATE DATABASE shared_calendar;"
   ```

3. Copy `.env.example` to `.env.local` and fill in the values (see below).

4. Create the tables by applying the migrations. `prisma migrate deploy` reads
   `.env`, not `.env.local`, so load the variable first or pass it explicitly.
   `npm run db:migrate` works if `DATABASE_URL` is set in your shell or `.env`:

   ```powershell
   $env:DATABASE_URL = "postgresql://postgres:PASSWORD@localhost:5432/shared_calendar"
   npm run db:migrate
   ```

   ```sh
   DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/shared_calendar" npm run db:migrate
   ```

5. Start the app:

   ```sh
   npm run dev
   ```

   Open http://localhost:3000, register an account (this first account is the
   administrator).

Stop the dev server before running `prisma generate` or migrations on Windows,
otherwise the Prisma engine file may be locked.

## Environment variables

| Variable               | Required | Description                                                                                                                                                                             |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | yes      | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/shared_calendar`. URL-encode special characters in the password.                                          |
| `COLLECTION_DATES_URL` | no       | URL of an ICS feed with waste collection dates. Shown in "My calendar" only. Without it, no waste chips are shown.                                                                      |
| `CAP_SERVER_URL`       | mobile   | Address of this server for the Capacitor app, e.g. `http://192.168.178.34:3000` (LAN IP or hostname, not `localhost`). Read by `npm run cap:sync` and the dev server's allowed origins. |

Never commit `.env.local`.

## Mobile app (Capacitor)

The Android/iOS app is a thin native shell that loads this site from your
server, so the app needs no store release and updates whenever the server does.
The project ids are in `capacitor.config.ts` (`appId` is `home.familycalendar`;
don't change it after the native projects exist). The app name follows the
device language on Android (Family Calendar / Familienkalender).

1. Put the server address in `.env.local`: `CAP_SERVER_URL=http://<server-ip>:3000`.
2. Run the server so the phone can reach it, e.g. `npm run build` and
   `npm start -- -H 0.0.0.0`, and allow the port in the firewall. Use a fixed
   IP for the server.
3. Sync the native projects: `npm run cap:sync` (re-run it whenever
   `CAP_SERVER_URL` or a Capacitor plugin changes, then rebuild the app).
4. Open and run: `npx cap open android` (Android Studio) or `npx cap open ios`
   (needs a Mac with Xcode).

`android/` and `ios/` are committed; build output and generated config are
ignored. `capacitor-www/index.html` is only a placeholder that Capacitor
requires; with `CAP_SERVER_URL` set it is never shown. Reminders become local
notifications inside the app (see "How it works"), and the Android back button
closes an open appointment form before navigating back.

### Building and distributing the Android APK

1. Run `npm run cap:sync`.
2. Build with Gradle from `android/`: `.\gradlew.bat assembleDebug` (macOS and
   Linux: `./gradlew assembleDebug`). Use a JDK 17-21; Gradle 8.14 does not run
   on Java 25, which newer Android Studio versions bundle. Set `JAVA_HOME` to a
   Java 21 JDK if needed. The result is
   `android/app/build/outputs/apk/debug/app-debug.apk`.
3. Copy it to `downloads/family-calendar.apk` on the server (git-ignored).
   The login and register pages then show a "Download the Android app" link
   (served by `/api/apk`) to visitors using an Android browser. The link is
   hidden in other browsers, inside the app, and while the file is missing.
4. On the phone, open the link, install the APK and allow "Install unknown
   apps" for the browser. Rebuild the APK only when `CAP_SERVER_URL`, plugins
   or native settings change; web changes arrive without reinstalling.

Icons are generated from one drawing: `node scripts/generate-icons.mjs`
rewrites the browser, Android and iOS icons.

## Scripts

| Command                                  | Purpose                                    |
| ---------------------------------------- | ------------------------------------------ |
| `npm run dev`                            | Development server                         |
| `npm run build` / `npm start`            | Production build and server                |
| `npm run lint`                           | ESLint                                     |
| `npm run db:migrate`                     | Apply migrations (`prisma migrate deploy`) |
| `npm run cap:sync`                       | Sync web config and plugins to android/ios |
| `npx tsc --noEmit`                       | Type check                                 |
| `npx prisma migrate dev --name <change>` | Create a new migration during development  |

Do not edit a migration after it has been applied to a shared database.
For a database that already has the tables from the old SQL setup, baseline the
initial migration once: `npx prisma migrate resolve --applied 20261026000000_init`.

## Project structure

```
app/
  (app)/            Pages behind login: calendar, shared, groups, settings, admin
  api/places/       Authenticated proxy for location suggestions (Photon/OSM)
  api/notifications/ Notification count (polled by the bell)
  api/reminders/    Upcoming reminders (scheduled as local notifications by the app)
  api/apk/          Serves downloads/family-calendar.apk
  api/health/       Database reachability check (used for offline mode)
  login/, register/ Public auth pages
  layout.tsx        Locale, theme cookie, global providers
components/         UI: CalendarBoard, MonthView, EventForm, ReminderPicker,
                    EventList, DateTimeInput, LocationInput, Nav, MobileNav,
                    Dropdown, Notifications, NotificationBell, LocalReminders,
                    NativeBack, ApkDownload, OfflineSupport, ...
public/sw.js        Service worker (page cache for offline mode)
android/, ios/      Capacitor native projects
capacitor-www/      Placeholder web dir required by Capacitor
downloads/          Put the built family-calendar.apk here (git-ignored)
scripts/            generate-icons.mjs (browser and app icons)
lib/
  actions.ts        Server actions (auth, events, groups, profile, admin)
  auth.ts           Sessions, password hashing, login throttling
  clock.ts          Time zone cookie and "floating now"
  backStack.ts      Back-button handlers for dialogs (native Android back)
  queries.ts        Data queries, recurrence expansion, reminders
  recurrence.ts     Repeat rules (daily/weekly/monthly/yearly)
  waste.ts          ICS parsing for waste collection dates
  dates.ts          Date formatting helpers
  db.ts             Prisma client
messages/           en.json, de.json translations
prisma/
  schema.prisma     Data model
  migrations/       SQL migrations
```

## How it works

- **Data model:** `User`, `Session`, `Group`, `GroupMember`, `Event`,
  `EventShare` (which groups an event is shared with), `EventInvite`
  (invited user, status `pending`/`accepted`/`declined`, and whether the owner
  has seen the answer), `EventReminder` and `ReminderSeen`.
- **Auth:** passwords are hashed; a random session token is stored in an
  HTTP-only cookie and only its hash is saved in the database. Login accepts
  the email or the (case-insensitive) name. Repeated failed
  logins are throttled. Changing the password signs out other devices.
- **Time handling:** appointment times are "floating": the entered wall-clock
  time is stored and shown as-is, independent of time zone.
- **Recurrence:** repeating events are stored once and expanded into
  occurrences for the visible month grid. Monthly/yearly repeats fall back to
  the month's last day when the day does not exist. Repeats never end;
  deleting or sharing affects the whole series.
- **Sharing:** an event is visible to its owner and to members of the groups
  it is shared with. The "Shared" page shows events from your groups.
- **Invitations:** only people who share a group with you can be invited
  (checked on the server). An invitee sees the appointment in "My calendar"
  only after accepting. Pending invitations and answers to your own
  appointments show up in the bell; the badge is polled every 10 seconds and
  when the tab regains focus.
- **Editing:** editing a repeating appointment changes the whole series.
  Existing invitees keep their answer; removed invitees are deleted.
- **Reminders:** an appointment can have several reminders (presets from 15
  minutes to 1 week, or a custom value) stored in `EventReminder`. They apply
  to the owner and to invitees who accepted, and fire for every occurrence of
  a repeating appointment. A due reminder appears in the bell (dismissals are
  stored in `ReminderSeen`). Because times are floating, "now" is computed
  from the browser's time zone offset, which is saved in a `tz` cookie.
  Inside the Capacitor app only (not in browsers), reminders also become
  on-device local notifications: the app asks for notification permission,
  fetches the next 14 days of reminders from `/api/reminders` (when opened,
  every minute while open, and when it returns to the foreground) and
  schedules them with `@capacitor/local-notifications`. Scheduled alerts keep
  firing while the app is closed or offline, but changes made elsewhere only
  reach the phone the next time the app is opened. No Firebase, push service
  or extra server component is needed. On Android 12+ allow "Alarms &
  reminders" for the app for exact timing.
- **Offline mode in the Android app:** the service worker can't run there (the
  app loads the site over plain `http` on a LAN address, which is not a secure
  context), so the app keeps its own copy. While you are online,
  `components/NativeSnapshot.tsx` saves a static copy (HTML plus the page's CSS)
  of up to 25 visited pages with `@capacitor/preferences`. When the server
  can't be reached, Capacitor shows `capacitor-www/offline.html`
  (`server.errorPath`), which renders the last saved page read-only with an
  "Offline, saved data from ..." bar, links between saved pages, and a Retry
  button. It checks the server every 8 seconds and reloads the live site as soon
  as it answers. If the connection drops while a page is open, the normal
  offline banner appears. Copies are cleared when the signed-in user changes or
  you log out. Saved pages are static: forms, menus and unsaved pages don't
  work offline. After changing this, run `npm run cap:sync` and rebuild the APK.
- **Offline mode:** `public/sw.js` is registered in production builds only.
  Pages are fetched from the network first and fall back to the saved copy
  when the server is unreachable, slow, or answers with a 5xx error. A banner
  is shown meanwhile and writes are not possible. `/api/health` is polled to
  detect the return of the database; then all saved pages are re-fetched and
  the current page refreshes. Saved pages are cleared when the signed-in user
  changes, and redirects are never stored. Test it with `npm run build` and
  `npm start`.
- **Waste dates:** the ICS feed is fetched server-side, cached for one hour
  and shown read-only. Hidden waste types are remembered in a cookie.
- **Location suggestions:** the browser calls `/api/places`, which requires a
  login and forwards the query to the free Photon geocoder.
- **i18n:** `next-intl` with a `locale` cookie; no URL prefixes. Add a language
  by adding `messages/<code>.json` and registering it in the i18n config.
