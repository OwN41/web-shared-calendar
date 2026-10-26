"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { REPEATS } from "@/lib/recurrence";
import type { Group } from "@/lib/queries";
import { createEvent } from "@/lib/actions";
import { DateTimeInput } from "./DateTimeInput";
import { LocationInput } from "./LocationInput";
import { btnCls, btnGhostCls, inputCls } from "./ui";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"];

export function EventForm({
  groups,
  back,
  day,
  defaultGroupIds = [],
  userColor,
  onClose,
}: {
  groups: Group[];
  back: "/calendar" | "/shared";
  day: string;
  defaultGroupIds?: string[];
  userColor: string;
  onClose: () => void;
}) {
  const t = useTranslations("eventForm");
  const [choice, setChoice] = useState("");
  const [custom, setCustom] = useState("#06b6d4");
  const customActive = choice !== "" && !COLORS.includes(choice);
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
        <DateTimeInput name="starts_at" label={t("starts")} required defaultValue={`${day}T09:00`} />
        <DateTimeInput name="ends_at" label={t("ends")} defaultValue={`${day}T10:00`} />
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm sm:col-span-2">
          {t("allDay")}
          <input type="checkbox" name="all_day" role="switch" className="peer sr-only" />
          <span className="relative h-6 w-11 shrink-0 rounded-full bg-zinc-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 dark:bg-zinc-700 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
        </label>
        <label className="text-sm sm:col-span-2">{t("repeat")}
          <select name="repeat" defaultValue="none" className={inputCls}>
            {REPEATS.map((r) => <option key={r} value={r}>{t(`repeat_${r}`)}</option>)}
          </select>
        </label>
        <fieldset className="flex flex-wrap items-center gap-2 text-sm sm:col-span-2">
          <legend className="mb-1 text-sm">{t("color")}</legend>
          <input type="hidden" name="color" value={choice} />
          {[["", userColor, t("colorDefault")], ...COLORS.map((c) => [c, c, c])].map(([value, shown, label]) => (
            <button
              key={value || "default"}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={choice === value}
              onClick={() => setChoice(value)}
              className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-zinc-900 ${choice === value ? "ring-2 ring-blue-500" : "hover:scale-110"}`}
              style={{ background: shown }}
            />
          ))}
          <label
            title={t("customColor")}
            className={`relative h-7 w-7 cursor-pointer overflow-hidden rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-zinc-900 ${customActive ? "ring-2 ring-blue-500" : "hover:scale-110"}`}
            style={{ background: customActive ? choice : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
          >
            <input
              type="color"
              aria-label={t("customColor")}
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setChoice(e.target.value);
              }}
              onClick={() => setChoice(custom)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </fieldset>
        <LocationInput name="location" placeholder={t("location")} />
        <input name="description" maxLength={2000} placeholder={t("notes")} className={inputCls} />
        <fieldset className="flex flex-wrap items-center gap-3 text-sm sm:col-span-2">
          <legend className="mb-1 text-sm font-medium">{t("shareWith")}</legend>
          {groups.length === 0 && (
            <p className="text-zinc-500">
              {t("noGroups")}{" "}
              <Link href="/groups" className="text-blue-600 hover:underline">{t("goToGroups")}</Link>
            </p>
          )}
          {groups.map((g) => (
            <label key={g.id} className="cursor-pointer">
              <input type="checkbox" name="groups" value={g.id} defaultChecked={defaultGroupIds.includes(g.id)} className="peer sr-only" />
              <span className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 hover:bg-zinc-100 peer-checked:hover:bg-blue-700 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {g.name}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="flex gap-2 sm:col-span-2">
          <button className={btnCls}>{t("save")}</button>
          <button type="button" onClick={onClose} className={btnGhostCls}>{t("cancel")}</button>
        </div>
      </form>
    </div>
  );
}
