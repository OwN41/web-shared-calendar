import { getLocale, getTranslations } from "next-intl/server";
import { dismissReminders, dismissResponses, respondInvite } from "@/lib/actions";
import { floatingNow, tzOffset } from "@/lib/clock";
import { formatDay, formatTime } from "@/lib/dates";
import { dueReminders, inviteResponses, pendingInvites } from "@/lib/queries";
import { NotificationBell } from "./NotificationBell";
import { btnCls, btnGhostCls } from "./ui";

export async function Notifications({ userId }: { userId: string }) {
  const now = await floatingNow();
  const [t, locale, invites, responses, reminders] = await Promise.all([
    getTranslations("notifications"),
    getLocale(),
    pendingInvites(userId),
    inviteResponses(userId),
    dueReminders(userId, now),
  ]);
  const count = invites.length + responses.length + reminders.length;

  const when = (start: Date) => {
    const mins = Math.round((start.getTime() - now.getTime()) / 60000);
    if (mins <= 0) return t("started");
    if (mins < 60) return t("inMinutes", { n: mins });
    if (mins < 1440) return t("inHours", { n: Math.round(mins / 60) });
    return t("inDays", { n: Math.round(mins / 1440) });
  };
  const alerts = reminders.map((r) => ({ key: r.key, title: r.title, body: when(r.occ_start) }));

  return (
    <NotificationBell count={count} label={t("title")} alerts={alerts} tz={await tzOffset()}>
      {count === 0 && <p className="text-zinc-500">{t("empty")}</p>}
      {reminders.length > 0 && (
        <section className="mb-4 space-y-3 border-b border-zinc-200 pb-3 dark:border-zinc-700">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">{t("reminders")}</h2>
            <form action={dismissReminders}>
              <input type="hidden" name="key" value="" />
              <button className="text-xs text-blue-600 hover:underline">{t("clearAll")}</button>
            </form>
          </div>
          <ul className="space-y-2">
            {reminders.map((r, i) => (
              <li key={r.key} className="flex items-start justify-between gap-2">
                <div>
                  <span aria-hidden>⏰</span> <span className="font-medium">{r.title}</span>
                  <div className="text-xs text-zinc-500">
                    {formatDay(r.occ_start, locale)} · {formatTime(r.occ_start)} · {alerts[i].body}
                  </div>
                </div>
                <form action={dismissReminders}>
                  <input type="hidden" name="key" value={r.key} />
                  <button aria-label={t("dismiss")} title={t("dismiss")} className="rounded px-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">×</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
      {invites.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">{t("invitations")}</h2>
          <ul className="space-y-3">
            {invites.map((i) => (
              <li key={i.id} className="space-y-1.5">
                <div>
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {formatDay(i.starts_at, locale)}
                    {i.all_day ? ` · ${t("allDay")}` : ` · ${formatTime(i.starts_at)}–${formatTime(i.ends_at)}`}
                    {" · "}{t("from", { name: i.owner_name })}
                  </div>
                </div>
                <form action={respondInvite} className="flex gap-2">
                  <input type="hidden" name="id" value={i.id} />
                  <button name="answer" value="accept" className={btnCls}>{t("accept")}</button>
                  <button name="answer" value="decline" className={btnGhostCls}>{t("decline")}</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
      {responses.length > 0 && (
        <section className={`space-y-3 ${invites.length > 0 ? "mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-700" : ""}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">{t("responses")}</h2>
            <form action={dismissResponses}>
              <input type="hidden" name="id" value="" />
              <input type="hidden" name="user" value="" />
              <button className="text-xs text-blue-600 hover:underline">{t("clearAll")}</button>
            </form>
          </div>
          <ul className="space-y-2">
            {responses.map((r) => (
              <li key={`${r.event_id}:${r.user_id}`} className="flex items-start justify-between gap-2">
                <div>
                  <span aria-hidden>{r.accepted ? "✓" : "✗"}</span>{" "}
                  {t(r.accepted ? "accepted" : "declined", { name: r.name, title: r.title })}
                  <div className="text-xs text-zinc-500">{formatDay(r.starts_at, locale)}</div>
                </div>
                <form action={dismissResponses}>
                  <input type="hidden" name="id" value={r.event_id} />
                  <input type="hidden" name="user" value={r.user_id} />
                  <button aria-label={t("dismiss")} title={t("dismiss")} className="rounded px-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">×</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </NotificationBell>
  );
}
