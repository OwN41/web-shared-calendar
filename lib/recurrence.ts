export const REPEATS = ["none", "daily", "weekly", "monthly", "yearly"] as const;
export type Repeat = (typeof REPEATS)[number];

export function isRepeat(v: string): v is Repeat {
  return (REPEATS as readonly string[]).includes(v);
}

const DAY = 86_400_000;

function addMonthsClamped(d: Date, months: number) {
  const total = d.getUTCMonth() + months;
  const y = d.getUTCFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
}

/** Start/end pairs of every occurrence overlapping [from, to). Times are floating (UTC wall clock). */
export function occurrences(startsAt: Date, endsAt: Date, repeat: Repeat, from: Date, to: Date) {
  const duration = endsAt.getTime() - startsAt.getTime();
  const out: { start: Date; end: Date }[] = [];
  const push = (start: Date) => {
    const end = new Date(start.getTime() + duration);
    if (start < to && end >= from) out.push({ start, end });
  };

  if (repeat === "none") {
    push(startsAt);
    return out;
  }

  if (repeat === "daily" || repeat === "weekly") {
    const step = repeat === "daily" ? DAY : 7 * DAY;
    const n0 = Math.max(0, Math.floor((from.getTime() - duration - startsAt.getTime()) / step));
    for (let n = n0; ; n++) {
      const start = new Date(startsAt.getTime() + n * step);
      if (start >= to) break;
      push(start);
    }
    return out;
  }

  const stepMonths = repeat === "monthly" ? 1 : 12;
  const monthsApart = (from.getUTCFullYear() - startsAt.getUTCFullYear()) * 12 + from.getUTCMonth() - startsAt.getUTCMonth();
  const n0 = Math.max(0, Math.floor(monthsApart / stepMonths) - 1 - Math.ceil(duration / (28 * DAY)));
  for (let n = n0; ; n++) {
    const start = addMonthsClamped(startsAt, n * stepMonths);
    if (start >= to) break;
    push(start);
  }
  return out;
}
