import { btnDangerCls, btnGhostCls, cardCls, inputCls } from "@/components/ui";
import { adminDeleteUser, adminResetPassword, adminSetDisabled, adminSetRole } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { adminUsers } from "@/lib/queries";

export default async function AdminUsers() {
  const me = await requireAdmin();
  const users = await adminUsers();
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-GB") : "never");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Accounts</h1>
      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id} className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">
                  {u.name}
                  {u.role === "admin" && <span className="ml-2 rounded bg-blue-100 px-1.5 text-xs text-blue-700">admin</span>}
                  {u.disabled && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs text-red-700">disabled</span>}
                </div>
                <div className="text-sm text-zinc-500">
                  {u.email} · joined {fmt(u.created_at)} · last login {fmt(u.last_login_at)} · {u.event_count} appointments · {u.group_count} groups
                </div>
              </div>
              {u.id !== me.id && (
                <div className="flex flex-wrap gap-2">
                  <form action={adminSetRole}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="role" value={u.role === "admin" ? "user" : "admin"} />
                    <button className={btnGhostCls}>{u.role === "admin" ? "Remove admin" : "Make admin"}</button>
                  </form>
                  <form action={adminSetDisabled}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="disabled" value={String(!u.disabled)} />
                    <button className={btnGhostCls}>{u.disabled ? "Enable" : "Disable"}</button>
                  </form>
                  <form action={adminDeleteUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className={btnDangerCls}>Delete</button>
                  </form>
                </div>
              )}
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-blue-600">Reset password…</summary>
              <form action={adminResetPassword} className="mt-2 flex gap-2">
                <input type="hidden" name="id" value={u.id} />
                <input name="password" type="password" minLength={8} required placeholder="New password (min. 8)" autoComplete="new-password" className={inputCls} />
                <button className={btnGhostCls}>Set</button>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
