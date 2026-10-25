import Link from "next/link";
import { EventForm } from "@/components/EventForm";
import { EventList } from "@/components/EventList";
import { MonthView } from "@/components/MonthView";
import { ErrorBanner } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { addMonths, monthKey, parseMonth } from "@/lib/dates";
import { groupMembers, myGroups, sharedEvents } from "@/lib/queries";

export default async function SharedPage({ searchParams }: PageProps<"/shared">) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = parseMonth(typeof sp.month === "string" ? sp.month : undefined);
  const groups = await myGroups(user.id);
  const selected = groups.find((g) => g.id === sp.group);
  const [events, members] = await Promise.all([
    sharedEvents(user.id, month, addMonths(month, 1), selected?.id),
    groupMembers((selected ? [selected] : groups).map((g) => g.id)),
  ]);
  const people = [...new Map(members.map((m) => [m.name + m.color, m])).values()];
  const tab = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm ${active ? "bg-blue-600 text-white" : "border border-zinc-300 dark:border-zinc-700"}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Shared calendar</h1>
      <ErrorBanner message={typeof sp.error === "string" ? sp.error : undefined} />
      {groups.length === 0 ? (
        <p className="text-sm">
          You are not in a group yet. <Link href="/groups" className="text-blue-600">Create or join one</Link> to share appointments.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Link href={`/shared?month=${monthKey(month)}`} className={tab(!selected)}>All groups</Link>
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
          <EventForm groups={groups} back="/shared" defaultGroupIds={selected ? [selected.id] : []} />
          <MonthView basePath="/shared" month={month} events={events} showOwner
            extraParams={selected ? `&group=${selected.id}` : ""} />
          <EventList events={events} groups={groups} userId={user.id} heading="Shared events this month" />
        </>
      )}
    </div>
  );
}
