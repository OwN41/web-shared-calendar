"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CalEvent, Contact, Group } from "@/lib/queries";
import { setHiddenWaste as saveHiddenWaste } from "@/lib/actions";
import { formatLongDay, monthKey, ymd } from "@/lib/dates";
import { EventForm } from "./EventForm";
import { Dropdown } from "./Dropdown";
import { EventList } from "./EventList";
import { btnCls } from "./ui";
import { MonthView } from "./MonthView";

export function CalendarBoard({
  basePath,
  month,
  events,
  groups,
  contacts,
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
  contacts: Contact[];
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
  const [editing, setEditing] = useState<CalEvent | null>(null);

  // Fresh data after a save (or a failed save) closes the form.
  const [seenEvents, setSeenEvents] = useState(events);
  if (seenEvents !== events) {
    setSeenEvents(events);
    setCreating(null);
    setEditing(null);
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
        {wasteTypes.length > 0 && (
          <Dropdown
            title={t("waste")}
            ariaLabel={t("waste")}
            wrapperClassName="relative md:hidden"
            summaryClassName="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 px-3 py-1 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            panelClassName="absolute left-0 z-20 mt-1 min-w-56 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            summary={
              <>
                {t("wasteShown", { shown: wasteTypes.length - hiddenWaste.filter((h) => wasteTypes.some(([x]) => x === h)).length, total: wasteTypes.length })}
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </>
            }
          >
            {wasteTypes.map(([type, color]) => {
              const on = !hiddenWaste.includes(type);
              return (
                <label key={type} className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <input type="checkbox" checked={on} onChange={() => toggleWaste(type)} className="peer sr-only" />
                  <span
                    aria-hidden
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1 peer-active:scale-90"
                    style={{ background: on ? color : "transparent", borderColor: on ? color : "#a1a1aa" }}
                  >
                    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 text-white transition-all duration-150 ${on ? "scale-100 opacity-100" : "scale-50 opacity-0"}`} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  </span>
                  <span className={`transition-opacity ${on ? "" : "opacity-60"}`}>{type}</span>
                </label>
              );
            })}
          </Dropdown>
        )}
        {wasteTypes.map(([type, color]) => {
          const on = !hiddenWaste.includes(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={on}
              onClick={() => toggleWaste(type)}
              className={`hidden items-center gap-1.5 rounded-full border px-3 py-1 transition-all duration-200 active:scale-95 md:flex ${
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
        {selected && (
          <button type="button" onClick={() => setCreating(selected)} className={`${btnCls} mb-3 hidden w-full [@media(pointer:coarse)]:block`}>
            {t("newEvent")}
          </button>
        )}
        <EventList events={dayEvents} groups={groups} userId={userId} heading={heading} onEdit={setEditing} />
        <p className="mt-3 hidden text-xs text-zinc-500 [@media(pointer:fine)]:block">{t("doubleClickHint")}</p>
      </aside>
      {creating && (
        <EventForm
          groups={groups}
          contacts={contacts}
          back={basePath}
          day={creating}
          defaultGroupIds={defaultGroupIds}
          userColor={userColor}
          onClose={() => setCreating(null)}
        />
      )}
      {editing && (
        <EventForm
          key={editing.occ}
          groups={groups}
          contacts={contacts}
          back={basePath}
          event={editing}
          userColor={userColor}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
    </div>
  );
}
