import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApkDownload } from "@/components/ApkDownload";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NativeSnapshot } from "@/components/NativeSnapshot";
import { OfflineSupport } from "@/components/OfflineSupport";
import { ThemeToggle } from "@/components/ThemeToggle";
import { login } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { ErrorBanner, btnCls, cardCls, inputCls } from "@/components/ui";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/calendar");
  const { error } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
      <OfflineSupport userId={null} banner={false} />
      <NativeSnapshot userId={null} />
      <form action={login} className={`${cardCls} w-full max-w-sm space-y-4`}>
        <h1 className="text-xl font-semibold">{t("login")}</h1>
        <ErrorBanner message={typeof error === "string" ? error : undefined} />
        <input name="login" type="text" required maxLength={254} autoComplete="username" placeholder={t("emailOrName")} className={inputCls} />
        <input name="password" type="password" required autoComplete="current-password" placeholder={t("password")} className={inputCls} />
        <button className={`${btnCls} w-full`}>{t("login")}</button>
        <p className="text-center text-sm">
          {t("noAccount")} <Link href="/register" className="text-blue-600">{t("register")}</Link>
        </p>
      </form>
      <ApkDownload />
      <div className="flex items-center gap-1"><LanguageSwitcher /><ThemeToggle /></div>
    </main>
  );
}
