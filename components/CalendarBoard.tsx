"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CalEvent, Group } from "@/lib/queries";
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
  extraParams,
  showOwner,
  defaultGroupIds,
}: {
  basePath: "/calendar" | "/shared";
  month: Date;
  events: CalEvent[];
  groups: Group[];
  userId: string;
  extraParams?: string;
  showOwner?: boolean;
  defaultGroupIds?: string[];
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
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
    for (const e of events) {
      // Spread multi-day events over each day they cover.
      for (let t = new Date(Date.UTC(e.starts_at.getUTCFullYear(), e.starts_at.getUTCMonth(), e.starts_at.getUTCDate()));
        t <= e.ends_at; t = new Date(t.getTime() + 86_400_000)) {
        const k = ymd(t);
        map.set(k, [...(map.get(k) ?? []), e]);
      }
    }
    return map;
  }, [events]);

  const dayEvents = selected ? (byDay.get(selected) ?? []) : [];
  const heading = selected ? formatLongDay(selected, locale) : t("selectDay");

  return (
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
          onClose={() => setCreating(null)}
        />
      )}
    </div>
  );
}
