"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { setTimezone } from "@/lib/actions";

const POLL_MS = 10_000;

export function NotificationBell({
  count: serverCount,
  label,
  tz,
  children,
}: {
  count: number;
  label: string;
  tz: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const [live, setLive] = useState<{ base: number; value: number } | null>(null);
  // A fresh server render supersedes any polled value.
  const count = live && live.base === serverCount ? live.value : serverCount;
  const latest = useRef({ serverCount, count });
  useEffect(() => {
    latest.current = { serverCount, count };
  });

  // Due reminders are computed in the user's wall-clock time, so the server needs the browser's offset.
  useEffect(() => {
    const offset = new Date().getTimezoneOffset();
    if (offset !== tz) setTimezone(offset).then(() => router.refresh());
  }, [tz, router]);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const { count: next } = (await res.json()) as { count: number };
        if (next !== latest.current.count) {
          setLive({ base: latest.current.serverCount, value: next });
          router.refresh();
        }
      } catch {}
    }
    const id = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    window.addEventListener("focus", poll);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", poll);
      window.removeEventListener("focus", poll);
    };
  }, [router]);

  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (el?.open && !(e.target instanceof Node && el.contains(e.target))) el.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current) ref.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className="sm:relative">
      <summary
        title={label}
        aria-label={count > 0 ? `${label} (${count})` : label}
        className="relative flex cursor-pointer list-none items-center rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </summary>
      <div className="absolute left-2 right-2 top-full z-40 mt-1 max-h-[70vh] overflow-y-auto rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900 sm:left-auto sm:right-0 sm:w-96">
        {children}
      </div>
    </details>
  );
}
