import { getCurrentUser } from "@/lib/auth";
import { floatingNow } from "@/lib/clock";
import { notificationCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ count: 0 }, { status: 401 });
  return Response.json({ count: await notificationCount(user.id, await floatingNow()) });
}
