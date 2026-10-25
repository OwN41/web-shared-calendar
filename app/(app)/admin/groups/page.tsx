import { btnDangerCls, btnGhostCls, cardCls, inputCls } from "@/components/ui";
import { adminAddMember, adminDeleteGroup, adminRemoveMember } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { adminGroupMembers, adminGroups } from "@/lib/queries";

export default async function AdminGroups() {
  await requireAdmin();
  const [groups, members] = await Promise.all([adminGroups(), adminGroupMembers()]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Groups</h1>
      {groups.length === 0 && <p className="text-sm text-zinc-500">No groups yet.</p>}
      <ul className="space-y-3">
        {groups.map((g) => (
          <li key={g.id} className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-sm text-zinc-500">
                  created by {g.creator ?? "deleted user"} · code <code className="font-mono">{g.invite_code}</code>
                </div>
              </div>
              <form action={adminDeleteGroup}>
                <input type="hidden" name="id" value={g.id} />
                <button className={btnDangerCls}>Delete group</button>
              </form>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {members.filter((m) => m.group_id === g.id).map((m) => (
                <li key={m.user_id} className="flex items-center justify-between">
                  <span>{m.name} <span className="text-zinc-500">({m.email}{m.role === "owner" ? ", owner" : ""})</span></span>
                  <form action={adminRemoveMember}>
                    <input type="hidden" name="group_id" value={g.id} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button className="text-red-600 hover:underline">remove</button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={adminAddMember} className="mt-2 flex gap-2">
              <input type="hidden" name="group_id" value={g.id} />
              <input name="email" type="email" required placeholder="Add member by email" className={inputCls} />
              <button className={btnGhostCls}>Add</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
