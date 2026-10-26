import { cardCls } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { dashboardStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className={cardCls}>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export default async function AdminDashboard() {
  await requireAdmin();
  let s: Awaited<ReturnType<typeof dashboardStats>>;
  try {
    s = await dashboardStats();
  } catch (e) {
    return (
      <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-300">
        <h1 className="font-semibold">Database unreachable</h1>
        <p className="text-sm">{e instanceof Error ? e.message : String(e)}</p>
      </div>
    );
  }
  const max = Math.max(1, ...s.perDay.map((d) => d.count));
  const connPct = Math.round((s.db.connections / s.db.max_connections) * 100);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Accounts" value={s.counts.users} hint={`${s.counts.disabled_users} disabled · ${s.counts.new_users} new (7d)`} />
        <Stat label="Active users (7d)" value={s.counts.active_users} />
        <Stat label="Groups" value={s.counts.groups} />
        <Stat label="Appointments" value={s.counts.events} hint={`${s.counts.shares} shares`} />
        <Stat label="Active sessions" value={s.counts.sessions} />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Database</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Status" value={<span className="text-green-600">● Online</span>} hint={`query latency ${s.latencyMs} ms`} />
          <Stat label="Size" value={s.db.size} />
          <Stat label="Open DB connections" value={`${s.db.connections} / ${s.db.max_connections}`} hint={`${connPct}% of the allowed maximum in use`} />
          <Stat label="Up since" value={s.db.started.toLocaleDateString("en-GB")} hint={s.db.version.split(" on ")[0]} />
        </div>
        <div className={`${cardCls} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-zinc-500"><th className="py-1">Table</th><th>Rows</th><th>Size</th></tr></thead>
            <tbody>
              {s.tables.map((t) => (
                <tr key={t.name} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-1 font-mono">{t.name}</td><td>{t.rows}</td><td>{t.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={cardCls}>
          <h2 className="mb-3 font-semibold">Appointments created (14 days)</h2>
          <div className="flex h-32 items-end gap-1">
            {s.perDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.count}`}>
                <div className="w-full rounded-t bg-blue-500" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 1 }} />
                <span className="text-[9px] text-zinc-500">{d.day.slice(3)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={cardCls}>
          <h2 className="mb-3 font-semibold">Most active users</h2>
          <ul className="space-y-1 text-sm">
            {s.topUsers.map((u) => (
              <li key={u.name} className="flex justify-between"><span>{u.name}</span><span>{u.events} appointments</span></li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
