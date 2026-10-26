"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Group } from "@/lib/queries";
import { createEvent } from "@/lib/actions";
import { btnCls, btnGhostCls, inputCls } from "./ui";

export function EventForm({
  groups,
  back,
  day,
  defaultGroupIds = [],
  onClose,
}: {
  groups: Group[];
  back: "/calendar" | "/shared";
  day: string;
  defaultGroupIds?: string[];
  onClose: () => void;
}) {
  const t = useTranslations("eventForm");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        action={createEvent}
        role="dialog"
        aria-label={t("title")}
        className="grid max-h-full w-full max-w-lg gap-3 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2"
      >
        <h2 className="font-semibold sm:col-span-2">{t("title")}</h2>
        <input type="hidden" name="back" value={back} />
        <input name="title" required autoFocus maxLength={200} placeholder={t("titlePlaceholder")} className={`${inputCls} sm:col-span-2`} />
        <label className="text-sm">{t("starts")}
          <input type="datetime-local" name="starts_at" required defaultValue={`${day}T09:00`} className={inputCls} />
        </label>
        <label className="text-sm">{t("ends")}
          <input type="datetime-local" name="ends_at" defaultValue={`${day}T10:00`} className={inputCls} />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="all_day" /> {t("allDay")}
        </label>
        <input name="location" maxLength={200} placeholder={t("location")} className={inputCls} />
        <input name="description" maxLength={2000} placeholder={t("notes")} className={inputCls} />
        {groups.length > 0 && (
          <fieldset className="flex flex-wrap items-center gap-3 text-sm sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">{t("shareWith")}</legend>
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-1">
                <input type="checkbox" name="groups" value={g.id} defaultChecked={defaultGroupIds.includes(g.id)} />
                {g.name}
              </label>
            ))}
          </fieldset>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <button className={btnCls}>{t("save")}</button>
          <button type="button" onClick={onClose} className={btnGhostCls}>{t("cancel")}</button>
        </div>
      </form>
    </div>
  );
}
