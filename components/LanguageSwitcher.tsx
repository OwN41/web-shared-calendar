import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/lib/actions";
import { locales } from "@/i18n/config";

export async function LanguageSwitcher() {
  const [current, t] = await Promise.all([getLocale(), getTranslations("language")]);
  return (
    <form action={setLocale} className="flex items-center gap-1 text-sm" aria-label={t("label")}>
      {locales.map((l) => (
        <button
          key={l}
          name="locale"
          value={l}
          aria-pressed={l === current}
          title={t(l)}
          className={`rounded-md px-2 py-1 uppercase ${
            l === current ? "bg-zinc-200 font-semibold dark:bg-zinc-700" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          {l}
        </button>
      ))}
    </form>
  );
}
