import { getCurrentUser } from "@/lib/auth";
import { floatingNow } from "@/lib/clock";
import { upcomingReminders } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ reminders: [] }, { status: 401 });
  return Response.json({ reminders: await upcomingReminders(user.id, await floatingNow()) });
}
