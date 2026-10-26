import { getTranslations } from "next-intl/server";
import { updateColor } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ErrorBanner, btnCls, cardCls } from "@/components/ui";

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const user = await requireUser();
  const { error, saved } = await searchParams;
  const [t, tAuth] = await Promise.all([getTranslations("settings"), getTranslations("auth")]);
  const account = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { username: true, email: true },
  });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <form action={updateColor} className={`${cardCls} space-y-4`}>
        <ErrorBanner message={typeof error === "string" ? error : undefined} />
        {saved && (
          <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            {t("saved")}
          </p>
        )}
        <p className="text-sm text-zinc-500">
          {t("signedInAs")} <span className="font-medium text-zinc-900 dark:text-zinc-100">{account.username}</span> ({account.email})
        </p>
        <label className="flex items-center justify-between text-sm">
          {tAuth("calendarColor")}
          <input name="color" type="color" defaultValue={user.color} className="h-8 w-12 cursor-pointer" />
        </label>
        <button className={btnCls}>{t("save")}</button>
      </form>
    </div>
  );
}
