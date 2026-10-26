"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/lib/actions";
import { locales } from "@/i18n/config";

export function LanguageSwitcher() {
  const current = useLocale();
  const t = useTranslations("language");
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (el?.open && !(e.target instanceof Node && el.contains(e.target))) el.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current) ref.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary
        title={t("label")}
        aria-label={t("label")}
        className="flex cursor-pointer list-none items-center rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
        </svg>
      </summary>
      <form
        action={setLocale}
        className="absolute right-0 z-20 mt-1 flex min-w-32 flex-col rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      >
        {locales.map((l) => (
          <button
            key={l}
            name="locale"
            value={l}
            aria-pressed={l === current}
            onClick={() => {
              if (ref.current) ref.current.open = false;
            }}
            className={`rounded px-3 py-1.5 text-left ${
              l === current ? "bg-zinc-100 font-semibold dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {t(l)}
          </button>
        ))}
      </form>
    </details>
  );
}
