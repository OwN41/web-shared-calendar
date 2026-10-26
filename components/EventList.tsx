import { useLocale, useTranslations } from "next-intl";
import type { CalEvent, Group } from "@/lib/queries";
import { deleteEvent, setEventShares } from "@/lib/actions";
import { formatDay, formatTime } from "@/lib/dates";
import { btnDangerCls, btnGhostCls, cardCls } from "./ui";

export function EventList({
  events,
  groups,
  userId,
  heading,
}: {
  events: CalEvent[];
  groups: Group[];
  userId: string;
  heading: string;
}) {
  const t = useTranslations("events");
  const locale = useLocale();
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  return (
    <section>
      <h3 className="mb-2 font-semibold">{heading}</h3>
      {events.length === 0 && <p className="text-sm text-zinc-500">{t("nothing")}</p>}
      <ul className="space-y-2">
        {events.map((e) => {
          const mine = e.owner_id === userId;
          return (
            <li key={e.occ} className={cardCls} style={{ borderLeft: `4px solid ${e.owner_color}` }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="mt-0.5 space-y-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <div>
                      {formatDay(e.starts_at, locale)}
                      {e.all_day ? ` · ${t("allDay")}` : ` · ${formatTime(e.starts_at)}–${formatTime(e.ends_at)}`}
                      {e.repeat !== "none" && ` · ↻ ${t(`repeat_${e.repeat}`)}`}
                    </div>
                    {e.location && (
                      <div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          📍 {e.location}
                        </a>
                      </div>
                    )}
                    {e.description && <div className="text-zinc-900 dark:text-zinc-100">{e.description}</div>}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {mine ? t("you") : e.owner_name}
                    {e.group_ids.length > 0 &&
                      ` · ${t("sharedWith", { groups: e.group_ids.map((g) => groupName.get(g) ?? t("aGroup")).join(", ") })}`}
                  </div>
                </div>
                {mine && (
                  <form action={deleteEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className={btnDangerCls}>{t("delete")}</button>
                  </form>
                )}
              </div>
              {mine && groups.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-blue-600">{t("share")}</summary>
                  <form action={setEventShares} className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <input type="hidden" name="id" value={e.id} />
                    {groups.map((g) => (
                      <label key={g.id} className="cursor-pointer">
                        <input type="checkbox" name="groups" value={g.id} defaultChecked={e.group_ids.includes(g.id)} className="peer sr-only" />
                        <span className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 hover:bg-zinc-100 peer-checked:hover:bg-blue-700 dark:border-zinc-700 dark:hover:bg-zinc-800">
                          {g.name}
                        </span>
                      </label>
                    ))}
                    <button className={btnGhostCls}>{t("save")}</button>
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
