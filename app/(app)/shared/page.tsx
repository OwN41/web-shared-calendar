import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarBoard } from "@/components/CalendarBoard";
import { ErrorBanner, btnCls, cardCls, inputCls } from "@/components/ui";
import { createGroup, joinGroup } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { monthGrid, monthKey, parseMonth } from "@/lib/dates";
import { contacts, groupMembers, myGroups, sharedEvents } from "@/lib/queries";

export default async function SharedPage({ searchParams }: PageProps<"/shared">) {
  const user = await requireUser();
  const t = await getTranslations("calendar");
  const g = await getTranslations("groups");
  const sp = await searchParams;
  const month = parseMonth(typeof sp.month === "string" ? sp.month : undefined);
  const groups = await myGroups(user.id);
  const selected = groups.find((g) => g.id === sp.group);
  const grid = monthGrid(month);
  const gridEnd = new Date(grid[grid.length - 1].getTime() + 86_400_000);
  const [events, members, contactList] = await Promise.all([
    sharedEvents(user.id, grid[0], gridEnd, selected?.id),
    groupMembers((selected ? [selected] : groups).map((g) => g.id)),
    contacts(user.id),
  ]);
  const people = [...new Map(members.map((m) => [m.name + m.color, m])).values()];
  const tab = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm ${active ? "bg-blue-600 text-white" : "border border-zinc-300 dark:border-zinc-700"}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("sharedTitle")}</h1>
      <ErrorBanner message={typeof sp.error === "string" ? sp.error : undefined} />
      {groups.length === 0 ? (
        <section className={`${cardCls} space-y-5 p-6`}>
          <div className="flex items-start gap-4">
            <span className="text-4xl" aria-hidden>👨‍👩‍👧‍👦</span>
            <div>
              <h2 className="text-lg font-semibold">{t("noGroup")}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("emptyHint")}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <form action={createGroup} className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="font-medium">{g("createTitle")}</h3>
              <input name="name" required maxLength={80} placeholder={g("namePlaceholder")} className={inputCls} />
              <button className={btnCls}>{g("create")}</button>
            </form>
            <form action={joinGroup} className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="font-medium">{g("joinTitle")}</h3>
              <input name="code" required placeholder={g("codePlaceholder")} className={`${inputCls} uppercase`} />
              <button className={btnCls}>{g("join")}</button>
            </form>
          </div>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Link href={`/shared?month=${monthKey(month)}`} className={tab(!selected)}>{t("allGroups")}</Link>
            {groups.map((g) => (
              <Link key={g.id} href={`/shared?month=${monthKey(month)}&group=${g.id}`} className={tab(selected?.id === g.id)}>
                {g.name}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {people.map((p) => (
              <span key={p.name + p.color} className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: p.color }} />{p.name}
              </span>
            ))}
          </div>
          <CalendarBoard
            key={`${monthKey(month)}-${selected?.id ?? "all"}`}
            basePath="/shared"
            month={month}
            events={events}
            groups={groups}
            contacts={contactList}
            userId={user.id}
            userColor={user.color}
            showOwner
            extraParams={selected ? `&group=${selected.id}` : ""}
            defaultGroupIds={selected ? [selected.id] : []}
          />
        </>
      )}
    </div>
  );
}
