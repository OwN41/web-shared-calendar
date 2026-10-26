import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { logout } from "@/lib/actions";
import type { User } from "@/lib/auth";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

export async function Nav({ user }: { user: User }) {
  const t = await getTranslations("nav");
  const links = [
    { href: "/calendar", label: t("myCalendar") },
    { href: "/shared", label: t("shared") },
    { href: "/groups", label: t("groups") },
    ...(user.role === "admin" ? [{ href: "/admin", label: t("admin") }] : []),
  ];
  const linkCls = "rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800";
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex w-full items-center gap-2 px-3 py-1.5 sm:px-8 md:gap-4 md:py-2 lg:px-12">
        <MobileNav
          links={links}
          user={{ name: user.name, color: user.color }}
          labels={{ menu: t("menu"), close: t("close"), settings: t("settings"), logout: t("logout") }}
        />
        <span className="font-semibold">{t("brand")}</span>
        <nav className="hidden flex-1 gap-1 text-sm md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <span className="hidden items-center gap-2 text-sm md:flex">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: user.color }} />
          <Link href="/settings" className="hover:underline" title={t("settings")}>{user.name}</Link>
        </span>
        <form action={logout} className="hidden md:block">
          <button className={`${linkCls} text-sm`}>{t("logout")}</button>
        </form>
      </div>
    </header>
  );
}
