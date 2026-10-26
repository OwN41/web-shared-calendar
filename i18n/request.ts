import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, defaultLocale, isLocale, type Locale } from "./config";

async function detectLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  const preferred = accept.split(",").map((p) => p.trim().slice(0, 2).toLowerCase());
  return preferred.find(isLocale) ?? defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await detectLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
