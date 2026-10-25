import type { CalEvent, Group } from "@/lib/queries";
import { deleteEvent, setEventShares } from "@/lib/actions";
import { formatDay, formatTime } from "@/lib/dates";
import { btnDangerCls, btnGhostCls, cardCls } from "./ui";

export function EventList({
  events,
  groups,
  userId,
  heading = "Events this month",
}: {
  events: CalEvent[];
  groups: Group[];
  userId: string;
  heading?: string;
}) {
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  return (
    <section>
      <h3 className="mb-2 mt-6 font-semibold">{heading}</h3>
      {events.length === 0 && <p className="text-sm text-zinc-500">Nothing planned.</p>}
      <ul className="space-y-2">
        {events.map((e) => {
          const mine = e.owner_id === userId;
          return (
            <li key={e.id} className={cardCls} style={{ borderLeft: `4px solid ${e.owner_color}` }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="text-sm text-zinc-500">
                    {formatDay(e.starts_at)}
                    {e.all_day ? " · all day" : ` · ${formatTime(e.starts_at)}–${formatTime(e.ends_at)}`}
                    {e.location && ` · ${e.location}`}
                  </div>
                  {e.description && <p className="mt-1 text-sm">{e.description}</p>}
                  <div className="mt-1 text-xs text-zinc-500">
                    {mine ? "You" : e.owner_name}
                    {e.group_ids.length > 0 &&
                      ` · shared with ${e.group_ids.map((g) => groupName.get(g) ?? "a group").join(", ")}`}
                  </div>
                </div>
                {mine && (
                  <form action={deleteEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className={btnDangerCls}>Delete</button>
                  </form>
                )}
              </div>
              {mine && groups.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-blue-600">Share…</summary>
                  <form action={setEventShares} className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <input type="hidden" name="id" value={e.id} />
                    {groups.map((g) => (
                      <label key={g.id} className="flex items-center gap-1">
                        <input type="checkbox" name="groups" value={g.id} defaultChecked={e.group_ids.includes(g.id)} />
                        {g.name}
                      </label>
                    ))}
                    <button className={btnGhostCls}>Save</button>
                  </form>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
