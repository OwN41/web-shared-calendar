import "server-only";
import { cookies } from "next/headers";

export const TZ_COOKIE = "tz";

/** Client's UTC offset in minutes as reported by Date#getTimezoneOffset, or the server's own when unknown. */
export async function tzOffset(): Promise<number> {
  const raw = (await cookies()).get(TZ_COOKIE)?.value;
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isInteger(n) && Math.abs(n) <= 14 * 60 ? n : new Date().getTimezoneOffset();
}

/** The user's current wall-clock time expressed as UTC, matching how event times are stored. */
export async function floatingNow(): Promise<Date> {
  return new Date(Date.now() - (await tzOffset()) * 60000);
}
