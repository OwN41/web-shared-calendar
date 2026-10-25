import { ErrorBanner, btnCls, btnDangerCls, btnGhostCls, cardCls, inputCls } from "@/components/ui";
import { createGroup, joinGroup, leaveGroup, regenerateInvite } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { groupMembers, myGroups } from "@/lib/queries";

export default async function GroupsPage({ searchParams }: PageProps<"/groups">) {
  const user = await requireUser();
  const { error } = await searchParams;
  const groups = await myGroups(user.id);
  const members = await groupMembers(groups.map((g) => g.id));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Groups</h1>
      <ErrorBanner message={typeof error === "string" ? error : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <form action={createGroup} className={`${cardCls} space-y-3`}>
          <h2 className="font-medium">Create a group</h2>
          <input name="name" required maxLength={80} placeholder="e.g. Family" className={inputCls} />
          <button className={btnCls}>Create</button>
        </form>
        <form action={joinGroup} className={`${cardCls} space-y-3`}>
          <h2 className="font-medium">Join with invite code</h2>
          <input name="code" required placeholder="Invite code" className={`${inputCls} uppercase`} />
          <button className={btnCls}>Join</button>
        </form>
      </div>
      <ul className="space-y-3">
        {groups.map((g) => (
          <li key={g.id} className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-sm text-zinc-500">
                  Invite code: <code className="font-mono">{g.invite_code}</code>
                </div>
              </div>
              <div className="flex gap-2">
                {g.role === "owner" && (
                  <form action={regenerateInvite}>
                    <input type="hidden" name="id" value={g.id} />
                    <button className={btnGhostCls}>New code</button>
                  </form>
                )}
                <form action={leaveGroup}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className={btnDangerCls}>Leave</button>
                </form>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {members.filter((m) => m.group_id === g.id).map((m) => (
                <span key={m.name + m.color} className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: m.color }} />
                  {m.name}{m.role === "owner" && " (owner)"}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
