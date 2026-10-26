import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

const APK_FILE = path.join(process.cwd(), "downloads", "family-calendar.apk");

export async function GET() {
  try {
    const info = await stat(APK_FILE);
    const body = Readable.toWeb(createReadStream(APK_FILE)) as ReadableStream;
    return new Response(body, {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Length": String(info.size),
        "Content-Disposition": 'attachment; filename="family-calendar.apk"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
