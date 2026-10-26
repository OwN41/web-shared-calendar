"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CalEvent, Group } from "@/lib/queries";
import { setHiddenWaste as saveHiddenWaste } from "@/lib/actions";
import { formatLongDay, monthKey, ymd } from "@/lib/dates";
import { EventForm } from "./EventForm";
import { EventList } from "./EventList";
import { MonthView } from "./MonthView";

export function CalendarBoard({
  basePath,
  month,
  events,
  groups,
  userId,
  userColor,
  extraParams,
  showOwner,
  defaultGroupIds,
  waste = [],
  initialHiddenWaste = [],
}: {
  basePath: "/calendar" | "/shared";
  month: Date;
  events: CalEvent[];
  groups: Group[];
  userId: string;
  userColor: string;
  extraParams?: string;
  showOwner?: boolean;
  defaultGroupIds?: string[];
  waste?: CalEvent[];
  initialHiddenWaste?: string[];
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const [hiddenWaste, setHiddenWaste] = useState(initialHiddenWaste);
  const wasteTypes = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of waste) m.set(w.title, w.owner_color);
    return [...m];
  }, [waste]);

  function toggleWaste(type: string) {
    const next = hiddenWaste.includes(type) ? hiddenWaste.filter((x) => x !== type) : [...hiddenWaste, type];
    setHiddenWaste(next);
    void saveHiddenWaste(next);
  }
  const [selected, setSelected] = useState<string | null>(() => {
    const today = ymd(new Date());
    return today.startsWith(monthKey(month)) ? today : `${monthKey(month)}-01`;
  });
  const [creating, setCreating] = useState<string | null>(null);

  // Fresh data after a save (or a failed save) closes the form.
  const [seenEvents, setSeenEvents] = useState(events);
  if (seenEvents !== events) {
    setSeenEvents(events);
    setCreating(null);
  }

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of [...events, ...waste.filter((w) => !hiddenWaste.includes(w.title))]) {
      // Spread multi-day events over each day they cover.
      for (let t = new Date(Date.UTC(e.starts_at.getUTCFullYear(), e.starts_at.getUTCMonth(), e.starts_at.getUTCDate()));
        t <= e.ends_at; t = new Date(t.getTime() + 86_400_000)) {
        const k = ymd(t);
        map.set(k, [...(map.get(k) ?? []), e]);
      }
    }
    return map;
  }, [events, waste, hiddenWaste]);

  const dayEvents = selected ? (byDay.get(selected) ?? []) : [];
  const heading = selected ? formatLongDay(selected, locale) : t("selectDay");

  return (
    <div className="space-y-3">
    {(wasteTypes.length > 0 || basePath === "/calendar") && (
      <div className="flex min-h-[30px] flex-wrap items-center gap-2 text-sm" role="group" aria-label={t("waste")}>
        <span className="text-zinc-500">{t("waste")}:</span>
        {wasteTypes.map(([type, color]) => {
          const on = !hiddenWaste.includes(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={on}
              onClick={() => toggleWaste(type)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                on ? "border-transparent text-white" : "border-zinc-300 text-zinc-500 line-through dark:border-zinc-700"
              }`}
              style={on ? { background: color } : undefined}
            >
              {!on && <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />}
              {type}
            </button>
          );
        })}
      </div>
    )}
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <MonthView
        basePath={basePath}
        month={month}
        byDay={byDay}
        extraParams={extraParams}
        showOwner={showOwner}
        selected={selected}
        onSelect={setSelected}
        onCreate={(day) => {
          setSelected(day);
          setCreating(day);
        }}
      />
      <aside aria-label={t("dayPanel")} className="min-w-0">
        <EventList events={dayEvents} groups={groups} userId={userId} heading={heading} />
        <p className="mt-3 text-xs text-zinc-500">{t("doubleClickHint")}</p>
      </aside>
      {creating && (
        <EventForm
          groups={groups}
          back={basePath}
          day={creating}
          defaultGroupIds={defaultGroupIds}
          userColor={userColor}
          onClose={() => setCreating(null)}
        />
      )}
    </div>
    </div>
  );
}
