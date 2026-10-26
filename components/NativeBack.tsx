"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { runBackHandler } from "@/lib/backStack";

/** In the Capacitor app only: the Android back button closes open dialogs first, then navigates back, then exits. */
export function NativeBack() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener("backButton", ({ canGoBack }) => {
      if (runBackHandler()) return;
      if (canGoBack) window.history.back();
      else App.exitApp();
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, []);
  return null;
}
