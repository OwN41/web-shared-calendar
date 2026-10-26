"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { CalEvent } from "@/lib/queries";
import { addMonths, formatMonth, monthGrid, monthKey, weekdayNames, ymd } from "@/lib/dates";

export function MonthView({
  basePath,
  month,
  byDay,
  extraParams = "",
  showOwner = false,
  selected,
  onSelect,
  onCreate,
}: {
  basePath: string;
  month: Date;
  byDay: Map<string, CalEvent[]>;
  extraParams?: string;
  showOwner?: boolean;
  selected: string | null;
  onSelect: (day: string) => void;
  onCreate: (day: string) => void;
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const days = monthGrid(month);
  const today = ymd(new Date());
  const href = (m: Date) => `${basePath}?month=${monthKey(m)}${extraParams}`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Link href={href(addMonths(month, -1))} className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"         aria-label={t("prevMonth")}>←</Link>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{formatMonth(month, locale)}</h2>
          <Link
            href={`${basePath}?month=${monthKey(new Date())}${extraParams}`}
            onClick={() => onSelect(today)}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t("today")}
          </Link>
        </div>
                <Link href={href(addMonths(month, 1))} className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label={t("nextMonth")}>→</Link>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-zinc-200 text-xs dark:border-zinc-800">
                {weekdayNames(locale).map((d) => (
          <div key={d} className="bg-zinc-100 p-1.5 text-center font-medium dark:bg-zinc-900">{d}</div>
        ))}
        {days.map((d) => {
          const k = ymd(d);
          const inMonth = d.getUTCMonth() === month.getUTCMonth();
          const list = byDay.get(k) ?? [];
          const isSelected = k === selected;
          return (
            <div
              key={k}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={t("dayLabel", { day: k, count: list.length })}
              onClick={() => onSelect(k)}
              onDoubleClick={() => onCreate(k)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreate(k);
                else if (e.key === " ") {
                  e.preventDefault();
                  onSelect(k);
                }
              }}
              className={`min-h-20 cursor-pointer select-none border-t border-l border-zinc-200 p-1 [touch-action:manipulation] dark:border-zinc-800 sm:min-h-28 lg:min-h-[calc((100dvh-14rem)/6)] ${
                inMonth ? "" : "bg-zinc-50 text-zinc-400 dark:bg-zinc-950"
              } ${isSelected ? "bg-blue-50 ring-2 ring-inset ring-blue-500 dark:bg-blue-950/40" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"}`}
            >
              <div className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full ${k === today ? "bg-blue-600 text-white" : ""}`}>
                {d.getUTCDate()}
              </div>
              <div className="space-y-0.5">
                {list.slice(0, 3).map((e) => (
                  <div key={e.occ} title={showOwner ? `${e.title} (${e.owner_name})` : e.title}
                    className="truncate rounded px-1 py-0.5 text-[11px] text-white"
                    style={{ background: e.owner_color }}>
                    {e.title}
                  </div>
                ))}
                {list.length > 3 && <div className="px-1 text-[11px]">{t("more", { count: list.length - 3 })}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
