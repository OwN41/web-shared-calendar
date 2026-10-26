import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarBoard } from "@/components/CalendarBoard";
import { ErrorBanner } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { monthGrid, monthKey, parseMonth } from "@/lib/dates";
import { groupMembers, myGroups, sharedEvents } from "@/lib/queries";

export default async function SharedPage({ searchParams }: PageProps<"/shared">) {
  const user = await requireUser();
  const t = await getTranslations("calendar");
  const sp = await searchParams;
  const month = parseMonth(typeof sp.month === "string" ? sp.month : undefined);
  const groups = await myGroups(user.id);
  const selected = groups.find((g) => g.id === sp.group);
  const grid = monthGrid(month);
  const gridEnd = new Date(grid[grid.length - 1].getTime() + 86_400_000);
  const [events, members] = await Promise.all([
    sharedEvents(user.id, grid[0], gridEnd, selected?.id),
    groupMembers((selected ? [selected] : groups).map((g) => g.id)),
  ]);
  const people = [...new Map(members.map((m) => [m.name + m.color, m])).values()];
  const tab = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm ${active ? "bg-blue-600 text-white" : "border border-zinc-300 dark:border-zinc-700"}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("sharedTitle")}</h1>
      <ErrorBanner message={typeof sp.error === "string" ? sp.error : undefined} />
      {groups.length === 0 ? (
        <p className="text-sm">
          {t("noGroup")} <Link href="/groups" className="text-blue-600">{t("createOrJoin")}</Link> {t("toShare")}
        </p>
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
