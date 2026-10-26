import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { logout } from "@/lib/actions";
import type { User } from "@/lib/auth";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function Nav({ user }: { user: User }) {
  const t = await getTranslations("nav");
  const links = [
    { href: "/calendar", label: t("myCalendar") },
    { href: "/shared", label: t("shared") },
    { href: "/groups", label: t("groups") },
  ];
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-8 lg:px-12">
        <span className="font-semibold">{t("brand")}</span>
        <nav className="flex flex-1 flex-wrap gap-1 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              {l.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link href="/admin" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              {t("admin")}
            </Link>
          )}
        </nav>
        <LanguageSwitcher />
        <span className="flex items-center gap-2 text-sm">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: user.color }} />
          <Link href="/settings" className="hover:underline" title={t("settings")}>{user.name}</Link>
        </span>
        <form action={logout}>
          <button className="rounded-md px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">{t("logout")}</button>
        </form>
      </div>
    </header>
  );
}
