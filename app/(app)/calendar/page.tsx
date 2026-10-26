import { getTranslations } from "next-intl/server";
import { CalendarBoard } from "@/components/CalendarBoard";
import { ErrorBanner } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { addMonths, monthKey, parseMonth } from "@/lib/dates";
import { myEvents, myGroups } from "@/lib/queries";

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const user = await requireUser();
  const t = await getTranslations("calendar");
  const sp = await searchParams;
  const month = parseMonth(typeof sp.month === "string" ? sp.month : undefined);
  const [events, groups] = await Promise.all([
    myEvents(user.id, month, addMonths(month, 1)),
    myGroups(user.id),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("myTitle")}</h1>
      <ErrorBanner message={typeof sp.error === "string" ? sp.error : undefined} />
      <CalendarBoard key={monthKey(month)} basePath="/calendar" month={month} events={events} groups={groups} userId={user.id} />
    </div>
  );
}
