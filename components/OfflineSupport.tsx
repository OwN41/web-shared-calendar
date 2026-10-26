"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const POLL_MS = 15_000;
const USER_KEY = "cache-user";

const toWorker = (message: string) => navigator.serviceWorker?.controller?.postMessage(message);

/** Registers the service worker, drops cached pages when the user changes, and refreshes them once the server is back. */
export function OfflineSupport({ userId, banner = true }: { userId: string | null; banner?: boolean }) {
  const t = useTranslations("offline");
  const router = useRouter();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  useEffect(() => {
    const previous = localStorage.getItem(USER_KEY);
    if (previous !== (userId ?? "")) {
      toWorker("clear");
      localStorage.setItem(USER_KEY, userId ?? "");
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let wasDown = false;
    async function check() {
      let up = false;
      try {
        up = navigator.onLine && (await fetch("/api/health", { cache: "no-store" })).ok;
      } catch {}
      setOffline(!up);
      if (up && wasDown) {
        toWorker("refresh");
        router.refresh();
      }
      wasDown = !up;
    }
    void check();
    const id = setInterval(check, POLL_MS);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, [userId, router]);

  if (!banner || !offline) return null;
  return (
    <div role="status" className="bg-amber-100 px-4 py-1.5 text-center text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
      {t("banner")}
    </div>
  );
}
