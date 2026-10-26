"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useTranslations } from "next-intl";

const SYNC_MS = 60_000;

type Reminder = { key: string; title: string; fire: string; start: string };

// Android needs a numeric id; derive a stable one from the reminder key.
const idOf = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
};

// Event times are floating (wall clock stored as UTC), so rebuild them as local device time.
const local = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
};

const pad = (n: number) => String(n).padStart(2, "0");

/** In the Capacitor app only: schedules the user's upcoming reminders as on-device notifications. */
export function LocalReminders() {
  const t = useTranslations("notifications");

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let stopped = false;

    async function sync() {
      if (stopped) return;
      try {
        let perm = await LocalNotifications.checkPermissions();
        if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
          perm = await LocalNotifications.requestPermissions();
        }
        if (perm.display !== "granted") return;

        const res = await fetch("/api/reminders", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const { reminders } = (await res.json()) as { reminders: Reminder[] };

        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
        const now = Date.now();
        const notifications = reminders
          .map((r) => {
            const start = new Date(r.start);
            return {
              id: idOf(r.key),
              title: r.title,
              body: t("startsAt", { time: `${pad(start.getUTCHours())}:${pad(start.getUTCMinutes())}` }),
              schedule: { at: local(r.fire), allowWhileIdle: true },
            };
          })
          .filter((n) => n.schedule.at.getTime() > now);
        if (notifications.length) await LocalNotifications.schedule({ notifications });
      } catch {}
    }

    void sync();
    const id = setInterval(sync, SYNC_MS);
    const onVisible = () => document.visibilityState === "visible" && void sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [t]);

  return null;
}
