import Link from "next/link";
import { logout } from "@/lib/actions";
import type { User } from "@/lib/auth";

const links = [
  { href: "/calendar", label: "My calendar" },
  { href: "/shared", label: "Shared" },
  { href: "/groups", label: "Groups" },
];

export function Nav({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <span className="font-semibold">📅 Family Calendar</span>
        <nav className="flex flex-1 flex-wrap gap-1 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              {l.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link href="/admin" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Admin
            </Link>
          )}
        </nav>
        <span className="flex items-center gap-2 text-sm">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: user.color }} />
          {user.name}
        </span>
        <form action={logout}>
          <button className="rounded-md px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">Log out</button>
        </form>
      </div>
    </header>
  );
}
