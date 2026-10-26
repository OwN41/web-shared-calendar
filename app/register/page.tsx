import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { register } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { ErrorBanner, btnCls, cardCls, inputCls } from "@/components/ui";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  if (await getCurrentUser()) redirect("/calendar");
  const { error } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
      <form action={register} className={`${cardCls} w-full max-w-sm space-y-4`}>
        <h1 className="text-xl font-semibold">{t("createAccount")}</h1>
        <ErrorBanner message={typeof error === "string" ? error : undefined} />
        <input name="name" required maxLength={80} autoComplete="name" placeholder={t("yourName")} className={inputCls} />
        <input name="email" type="email" required autoComplete="email" placeholder={t("email")} className={inputCls} />
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder={t("passwordMin")} className={inputCls} />
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder={t("confirmPassword")} className={inputCls} />
        <label className="flex items-center justify-between text-sm">
          {t("calendarColor")}
          <input name="color" type="color" defaultValue="#3b82f6" className="h-8 w-12 cursor-pointer" />
        </label>
        <button className={`${btnCls} w-full`}>{t("register")}</button>
        <p className="text-center text-sm">
          {t("alreadyRegistered")} <Link href="/login" className="text-blue-600">{t("login")}</Link>
        </p>
      </form>
      <div className="flex items-center gap-1"><LanguageSwitcher /><ThemeToggle /></div>
    </main>
  );
}
