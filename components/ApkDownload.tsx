import { access } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";

const APK_FILE = path.join(process.cwd(), "downloads", "family-calendar.apk");

export async function ApkDownload() {
  const exists = await access(APK_FILE).then(() => true, () => false);
  if (!exists) return null;
  const t = await getTranslations("auth");
  return (
    <a href="/api/apk" download className="text-sm text-blue-600">
      {t("downloadApp")}
    </a>
  );
}
