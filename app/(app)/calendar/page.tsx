import { EventForm } from "@/components/EventForm";
import { EventList } from "@/components/EventList";
import { MonthView } from "@/components/MonthView";
import { ErrorBanner } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { addMonths, parseMonth } from "@/lib/dates";
import { myEvents, myGroups } from "@/lib/queries";

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = parseMonth(typeof sp.month === "string" ? sp.month : undefined);
  const [events, groups] = await Promise.all([
    myEvents(user.id, month, addMonths(month, 1)),
    myGroups(user.id),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My calendar</h1>
      <ErrorBanner message={typeof sp.error === "string" ? sp.error : undefined} />
      <EventForm groups={groups} back="/calendar" />
      <MonthView basePath="/calendar" month={month} events={events} />
      <EventList events={events} groups={groups} userId={user.id} />
    </div>
  );
}
