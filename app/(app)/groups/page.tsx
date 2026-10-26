import { getTranslations } from "next-intl/server";
import { CopyButton } from "@/components/CopyButton";
import { ErrorBanner, btnCls, btnDangerCls, btnGhostCls, cardCls, inputCls } from "@/components/ui";
import { createGroup, joinGroup, leaveGroup, regenerateInvite } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { groupMembers, myGroups } from "@/lib/queries";

export default async function GroupsPage({ searchParams }: PageProps<"/groups">) {
  const user = await requireUser();
  const { error } = await searchParams;
  const t = await getTranslations("groups");
  const groups = await myGroups(user.id);
  const members = await groupMembers(groups.map((g) => g.id));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <ErrorBanner message={typeof error === "string" ? error : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <form action={createGroup} className={`${cardCls} space-y-3`}>
          <h2 className="font-medium">{t("createTitle")}</h2>
          <input name="name" required maxLength={80} placeholder={t("namePlaceholder")} className={inputCls} />
          <button className={btnCls}>{t("create")}</button>
        </form>
        <form action={joinGroup} className={`${cardCls} space-y-3`}>
          <h2 className="font-medium">{t("joinTitle")}</h2>
          <input name="code" required placeholder={t("codePlaceholder")} className={`${inputCls} uppercase`} />
          <button className={btnCls}>{t("join")}</button>
        </form>
      </div>
      <ul className="space-y-3">
        {groups.map((g) => (
          <li key={g.id} className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-sm text-zinc-500">
                  {t("inviteCode")} <code className="font-mono">{g.invite_code}</code>
                </div>
              </div>
              <div className="flex gap-2">
                <CopyButton text={g.invite_code} />
                {g.role === "owner" && (
                  <form action={regenerateInvite}>
                    <input type="hidden" name="id" value={g.id} />
                    <button className={btnGhostCls}>{t("newCode")}</button>
                  </form>
                )}
                <form action={leaveGroup}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className={btnDangerCls}>{t("leave")}</button>
                </form>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {members.filter((m) => m.group_id === g.id).map((m) => (
                <span key={m.name + m.color} className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: m.color }} />
                  {m.name}{m.role === "owner" && ` (${t("owner")})`}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
