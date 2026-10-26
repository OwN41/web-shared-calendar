"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const MAX_PAGES = 25;
const pageKey = (path: string) => `snap:p:${path}`;

async function clearAll() {
  await Preferences.clear();
}

function collectCss() {
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      css += Array.from(sheet.cssRules, (r) => r.cssText).join("\n");
    } catch {}
  }
  return css;
}

/** In the Capacitor app only: keeps a static copy of the pages you visit so the app can show them while the server is unreachable (capacitor-www/offline.html). */
export function NativeSnapshot({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastCss = "";
    let stopped = false;

    async function save() {
      if (stopped || !navigator.onLine || document.visibilityState !== "visible") return;
      if (document.querySelector("[aria-busy='true']")) return;
      const path = location.pathname + location.search;
      if (path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/api")) return;

      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("script, noscript, next-route-announcer, [data-snapshot-skip], [role='status']").forEach((el) => el.remove());
      const css = collectCss();
      const entry = {
        time: Date.now(),
        lang: document.documentElement.lang,
        htmlClass: document.documentElement.className,
        bodyClass: document.body.className,
        body: clone.innerHTML,
      };
      const raw = await Preferences.get({ key: "snap:idx" });
      const index: string[] = raw.value ? JSON.parse(raw.value) : [];
      const next = [...index.filter((p) => p !== path), path];
      for (const old of next.splice(0, Math.max(0, next.length - MAX_PAGES))) {
        await Preferences.remove({ key: pageKey(old) });
      }
      await Preferences.set({ key: pageKey(path), value: JSON.stringify(entry) });
      await Preferences.set({ key: "snap:idx", value: JSON.stringify(next) });
      await Preferences.set({ key: "snap:last", value: path });
      await Preferences.set({ key: "snap:server", value: location.origin });
      if (css !== lastCss) {
        lastCss = css;
        await Preferences.set({ key: "snap:css", value: css });
      }
    }

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void save(), 1500);
    };

    async function start() {
      const stored = (await Preferences.get({ key: "snap:user" })).value;
      if (stored !== (userId ?? "")) {
        await clearAll();
        await Preferences.set({ key: "snap:user", value: userId ?? "" });
      }
      if (stopped || !userId) return;
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      schedule();
    }

    const observer = new MutationObserver(schedule);
    document.addEventListener("visibilitychange", schedule);
    void start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [userId]);

  return null;
}
