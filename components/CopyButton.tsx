"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { btnGhostCls } from "./ui";

export function CopyButton({ text }: { text: string }) {
  const t = useTranslations("groups");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("copyCode"), text);
    }
  }

  return (
    <button type="button" onClick={copy} className={btnGhostCls}>
      {copied ? t("copied") : t("copyCode")}
    </button>
  );
}
