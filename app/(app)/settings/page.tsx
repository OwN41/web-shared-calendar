import { getTranslations } from "next-intl/server";
import { changePassword, updateColor, updateProfile } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ErrorBanner, btnCls, cardCls, inputCls } from "@/components/ui";

const SAVED = { color: "saved", profile: "savedProfile", password: "savedPassword" } as const;

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const user = await requireUser();
  const { error, saved } = await searchParams;
  const [t, tAuth] = await Promise.all([getTranslations("settings"), getTranslations("auth")]);
  const account = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { email: true, name: true },
  });
  const savedKey = typeof saved === "string" && saved in SAVED ? SAVED[saved as keyof typeof SAVED] : null;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <ErrorBanner message={typeof error === "string" ? error : undefined} />
      {savedKey && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {t(savedKey)}
        </p>
      )}

      <form action={updateProfile} className={`${cardCls} space-y-3`}>
        <h2 className="font-medium">{t("profileTitle")}</h2>
        <label className="block text-sm">{t("name")}
          <input name="name" required maxLength={80} defaultValue={account.name} autoComplete="name" className={inputCls} />
        </label>
        <label className="block text-sm">{t("email")}
          <input name="email" type="email" required maxLength={254} defaultValue={account.email} autoComplete="email" className={inputCls} />
        </label>
        <label className="block text-sm">{t("currentPassword")}
          <input name="current_password" type="password" autoComplete="current-password" className={inputCls} />
          <span className="text-xs text-zinc-500">{t("currentPasswordHint")}</span>
        </label>
        <button className={btnCls}>{t("save")}</button>
      </form>

      <form action={updateColor} className={`${cardCls} space-y-3`}>
        <h2 className="font-medium">{t("colorTitle")}</h2>
        <label className="flex items-center justify-between text-sm">
          {tAuth("calendarColor")}
          <input name="color" type="color" defaultValue={user.color} className="h-8 w-12 cursor-pointer" />
        </label>
        <button className={btnCls}>{t("save")}</button>
      </form>

      <form action={changePassword} className={`${cardCls} space-y-3`}>
        <h2 className="font-medium">{t("passwordTitle")}</h2>
        <input name="current_password" type="password" required placeholder={t("currentPassword")} autoComplete="current-password" className={inputCls} />
        <input name="new_password" type="password" required minLength={8} maxLength={200} placeholder={t("newPassword")} autoComplete="new-password" className={inputCls} />
        <input name="confirm" type="password" required minLength={8} maxLength={200} placeholder={t("confirmPassword")} autoComplete="new-password" className={inputCls} />
        <button className={btnCls}>{t("save")}</button>
      </form>
    </div>
  );
}
