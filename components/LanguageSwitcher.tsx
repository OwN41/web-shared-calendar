"use client";

import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/lib/actions";
import { locales } from "@/i18n/config";
import { Dropdown } from "./Dropdown";

export function LanguageSwitcher() {
  const current = useLocale();
  const t = useTranslations("language");

  return (
    <Dropdown
      title={t("label")}
      ariaLabel={t("label")}
      wrapperClassName="relative"
      summaryClassName="flex cursor-pointer items-center rounded-md p-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
      panelClassName="absolute right-0 z-20 mt-1 min-w-32 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      closeOnSelect
      summary={
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
        </svg>
      }
    >
      <form action={setLocale} className="flex flex-col">
        {locales.map((l) => (
          <button
            key={l}
            name="locale"
            value={l}
            aria-pressed={l === current}
            className={`rounded px-3 py-1.5 text-left transition-colors ${
              l === current ? "bg-zinc-100 font-semibold dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {t(l)}
          </button>
        ))}
      </form>
    </Dropdown>
  );
}
