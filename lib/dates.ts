// Event times are "floating": the wall-clock time typed by the user is stored
// and shown as-is (as UTC), so every family member sees the same time.

const pad = (n: number) => String(n).padStart(2, "0");

export const ymd = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;

export function parseMonth(value: string | undefined): Date {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (m && +m[2] >= 1 && +m[2] <= 12) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, 1));
  }
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
}

export const addMonths = (d: Date, n: number) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

export function parseLocalInput(value: string, allDay: boolean): Date | null {
  const v = allDay ? `${value.slice(0, 10)}T00:00` : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const formatTime = (d: Date, locale = "de") =>
  locale === "de"
    ? `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
    : `${d.getUTCHours() % 12 || 12}:${pad(d.getUTCMinutes())} ${d.getUTCHours() < 12 ? "AM" : "PM"}`;

export const formatDay = (d: Date, locale: string) =>
  d.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export const formatLongDay = (key: string, locale: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

export const formatMonth = (d: Date, locale: string) =>
  d.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** Monday-first short weekday names. */
export const weekdayNames = (locale: string) =>
  Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }),
  );

/** Monday-first grid of days covering the month. */
export function monthGrid(month: Date): Date[] {
  const first = month;
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(first.getTime() - offset * 86_400_000);
  const next = addMonths(month, 1);
  const days = Math.ceil(((next.getTime() - start.getTime()) / 86_400_000) / 7) * 7;
  return Array.from({ length: days }, (_, i) => new Date(start.getTime() + i * 86_400_000));
}
