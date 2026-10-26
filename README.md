# web-shared-calendar

A shared family calendar. Everyone keeps a personal calendar, can share
appointments with groups, and sees a combined view of what others shared.

## Features

- Registration and login with email and password (the first account becomes admin)
- Month calendar; double-click a day to create an appointment
- Appointments with date/time (24h), all-day switch, location (with address
  suggestions and a Google Maps link), note, own colour and repeat
  (daily / weekly / monthly / yearly)
- Groups: share appointments with one or more groups; "Shared" page shows what
  is shared with you
- Admin area for managing users and groups
- Profile settings: name, email, password and calendar colour
- English and German (cookie-based, switchable in the header), dark/light theme
- Responsive layout with a side drawer navigation on mobile
- Optional waste collection dates from an ICS feed, with per-type filters

## Tech stack

Next.js 16 (App Router, server actions), React 19, TypeScript, Tailwind CSS 4,
Prisma 6 with PostgreSQL, next-intl. Capacitor is included for optional
iOS/Android wrapping.

> This Next.js version has breaking changes compared to older releases. See
> `node_modules/next/dist/docs/` before changing framework-level code.

## Requirements

- Node.js 20+
- PostgreSQL 14+ (developed against 18)

## Setup

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

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/shared_calendar`. URL-encode special characters in the password. |
| `COLLECTION_DATES_URL` | no | URL of an ICS feed with waste collection dates. Shown in "My calendar" only. Without it, no waste chips are shown. |

Never commit `.env.local`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npx tsc --noEmit` | Type check |
| `npx prisma migrate dev --name <change>` | Create a new migration during development |

Do not edit a migration after it has been applied to a shared database.
For a database that already has the tables from the old SQL setup, baseline the
initial migration once: `npx prisma migrate resolve --applied 20261026000000_init`.

## Project structure

```
app/
  (app)/            Pages behind login: calendar, shared, groups, settings, admin
  api/places/       Authenticated proxy for location suggestions (Photon/OSM)
  login/, register/ Public auth pages
  layout.tsx        Locale, theme cookie, global providers
components/         UI: CalendarBoard, MonthView, EventForm, EventList,
                    DateTimeInput, LocationInput, Nav, MobileNav, ...
lib/
  actions.ts        Server actions (auth, events, groups, profile, admin)
  auth.ts           Sessions, password hashing, login throttling
  queries.ts        Data queries and recurrence expansion
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
  `EventShare` (which groups an event is shared with).
- **Auth:** passwords are hashed; a random session token is stored in an
  HTTP-only cookie and only its hash is saved in the database. Repeated failed
  logins are throttled. Changing the password signs out other devices.
- **Time handling:** appointment times are "floating": the entered wall-clock
  time is stored and shown as-is, independent of time zone.
- **Recurrence:** repeating events are stored once and expanded into
  occurrences for the visible month grid. Monthly/yearly repeats fall back to
  the month's last day when the day does not exist. Repeats never end;
  deleting or sharing affects the whole series.
- **Sharing:** an event is visible to its owner and to members of the groups
  it is shared with. The "Shared" page shows events from your groups.
- **Waste dates:** the ICS feed is fetched server-side, cached for one hour
  and shown read-only. Hidden waste types are remembered in a cookie.
- **Location suggestions:** the browser calls `/api/places`, which requires a
  login and forwards the query to the free Photon geocoder.
- **i18n:** `next-intl` with a `locale` cookie; no URL prefixes. Add a language
  by adding `messages/<code>.json` and registering it in the i18n config.
