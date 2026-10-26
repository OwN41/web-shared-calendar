import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { CalendarBoard } from "@/components/CalendarBoard";
import { ErrorBanner } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { monthGrid, monthKey, parseMonth } from "@/lib/dates";
import { myEvents, myGroups } from "@/lib/queries";
import { collectionDates } from "@/lib/waste";

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const user = await requireUser();
  const t = await getTranslations("calendar");
  const sp = await searchParams;
  const month = parseMonth(typeof sp.month === "string" ? sp.month : undefined);
  const grid = monthGrid(month);
  const gridEnd = new Date(grid[grid.length - 1].getTime() + 86_400_000);
  const [events, groups, waste] = await Promise.all([
    myEvents(user.id, grid[0], gridEnd),
    myGroups(user.id),
    collectionDates(grid[0], gridEnd, t("waste")),
  ]);
  let hiddenWaste: string[] = [];
  try {
    const raw = (await cookies()).get("wasteHidden")?.value;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) hiddenWaste = parsed.filter((x): x is string => typeof x === "string");
  } catch {}
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("myTitle")}</h1>
      <ErrorBanner message={typeof sp.error === "string" ? sp.error : undefined} />
      <CalendarBoard
        key={monthKey(month)}
        basePath="/calendar"
        month={month}
        events={events}
        groups={groups}
        userId={user.id}
        userColor={user.color}
        waste={waste}
        initialHiddenWaste={hiddenWaste}
      />
    </div>
  );
}
