import Link from "next/link";
import type { CalEvent } from "@/lib/queries";
import { addMonths, formatMonth, monthGrid, monthKey, ymd } from "@/lib/dates";

export function MonthView({
  basePath,
  month,
  events,
  extraParams = "",
  showOwner = false,
}: {
  basePath: string;
  month: Date;
  events: CalEvent[];
  extraParams?: string;
  showOwner?: boolean;
}) {
  const days = monthGrid(month);
  const today = ymd(new Date());
  const href = (m: Date) => `${basePath}?month=${monthKey(m)}${extraParams}`;

  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    // Spread multi-day events over each day they cover.
    for (let t = new Date(Date.UTC(e.starts_at.getUTCFullYear(), e.starts_at.getUTCMonth(), e.starts_at.getUTCDate()));
      t <= e.ends_at; t = new Date(t.getTime() + 86_400_000)) {
      const k = ymd(t);
      byDay.set(k, [...(byDay.get(k) ?? []), e]);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Link href={href(addMonths(month, -1))} className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Previous month">←</Link>
        <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
        <Link href={href(addMonths(month, 1))} className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Next month">→</Link>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-zinc-200 text-xs dark:border-zinc-800">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-zinc-100 p-1.5 text-center font-medium dark:bg-zinc-900">{d}</div>
        ))}
        {days.map((d) => {
          const k = ymd(d);
          const inMonth = d.getUTCMonth() === month.getUTCMonth();
          const list = byDay.get(k) ?? [];
          return (
            <div key={k} className={`min-h-20 border-t border-l border-zinc-200 p-1 dark:border-zinc-800 sm:min-h-28 ${inMonth ? "" : "bg-zinc-50 text-zinc-400 dark:bg-zinc-950"}`}>
              <div className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full ${k === today ? "bg-blue-600 text-white" : ""}`}>
                {d.getUTCDate()}
              </div>
              <div className="space-y-0.5">
                {list.slice(0, 3).map((e) => (
                  <div key={e.id} title={showOwner ? `${e.title} (${e.owner_name})` : e.title}
                    className="truncate rounded px-1 py-0.5 text-[11px] text-white"
                    style={{ background: e.owner_color }}>
                    {e.title}
                  </div>
                ))}
                {list.length > 3 && <div className="px-1 text-[11px]">+{list.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
