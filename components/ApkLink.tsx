"use client";

import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const isAndroidBrowser = () =>
  !Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent);

export function ApkLink({ label }: { label: string }) {
  const show = useSyncExternalStore(subscribe, isAndroidBrowser, () => false);
  if (!show) return null;
  return (
    <a href="/api/apk" download className="text-sm text-blue-600">
      {label}
    </a>
  );
}
