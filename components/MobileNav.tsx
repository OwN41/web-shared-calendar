"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { logout } from "@/lib/actions";

export function MobileNav({
  links,
  user,
  labels,
}: {
  links: { href: string; label: string }[];
  user: { name: string; color: string };
  labels: { menu: string; close: string; settings: string; logout: string };
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [top, setTop] = useState(0);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setClosing(true);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function toggle() {
    if (open && !closing) return setClosing(true);
    if (!open) {
      setTop(button.current?.closest("header")?.getBoundingClientRect().bottom ?? 0);
      setOpen(true);
    }
  }

  const close = () => setClosing(true);
  const item = "block rounded-md px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800";

  return (
    <div className="md:hidden">
      <button
        ref={button}
        type="button"
        aria-label={open && !closing ? labels.close : labels.menu}
        aria-expanded={open && !closing}
        onClick={toggle}
        className="rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-x-0 top-0 z-20 h-dvh" style={{ top, height: `calc(100dvh - ${top}px)` }}>
            <div className={`absolute inset-0 bg-black/40 ${closing ? "drawer-fade-out" : "drawer-fade-in"}`} onClick={close} />
            <aside
              role="dialog"
              aria-label={labels.menu}
              onAnimationEnd={() => {
                if (closing) {
                  setOpen(false);
                  setClosing(false);
                }
              }}
              className={`absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col gap-1 border-r border-zinc-200 bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl dark:border-zinc-800 dark:bg-zinc-950 ${closing ? "drawer-out" : "drawer-in"}`}
            >
              <nav className="flex flex-col text-sm">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} onClick={close} className={item}>{l.label}</Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col border-t border-zinc-200 pt-2 text-sm dark:border-zinc-800">
                <Link href="/settings" onClick={close} className={`${item} flex items-center gap-2`} title={labels.settings}>
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: user.color }} />
                  {user.name}
                </Link>
                <form action={logout}>
                  <button className={`${item} w-full text-left`}>{labels.logout}</button>
                </form>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </div>
  );
}
