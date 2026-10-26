import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const t = await getTranslations("admin");
  return (
    <div className="space-y-4">
      <nav className="flex gap-2 text-sm">
        {[["/admin", t("dashboard")], ["/admin/users", t("accounts")], ["/admin/groups", t("groups")]].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
