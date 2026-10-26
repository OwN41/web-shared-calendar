"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { REPEATS } from "@/lib/recurrence";
import type { CalEvent, Contact, Group } from "@/lib/queries";
import { createEvent, updateEvent } from "@/lib/actions";
import { DateTimeInput } from "./DateTimeInput";
import { LocationInput } from "./LocationInput";
import { ReminderPicker } from "./ReminderPicker";
import { btnCls, btnGhostCls, inputCls } from "./ui";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"];

const isoLocal = (d: Date) => d.toISOString().slice(0, 16);

export function EventForm({
  groups,
  contacts,
  back,
  day,
  event,
  defaultGroupIds = [],
  userColor,
  onClose,
}: {
  groups: Group[];
  contacts: Contact[];
  back: "/calendar" | "/shared";
  day?: string;
  event?: CalEvent;
  defaultGroupIds?: string[];
  userColor: string;
  onClose: () => void;
}) {
  const t = useTranslations("eventForm");
  const [choice, setChoice] = useState(event?.color ?? "");
  const [custom, setCustom] = useState(event?.color && !COLORS.includes(event.color) ? event.color : "#06b6d4");
  const customActive = choice !== "" && !COLORS.includes(choice);
  const startValue = event ? isoLocal(event.series_start) : `${day}T09:00`;
  const endValue = event
    ? event.all_day
      ? `${isoLocal(event.series_end).slice(0, 10)}T00:00`
      : isoLocal(event.series_end)
    : `${day}T10:00`;
  const groupIds = event ? event.group_ids : defaultGroupIds;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 pt-[calc(env(safe-area-inset-top)+3.5rem)]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        action={event ? updateEvent : createEvent}
        role="dialog"
        aria-label={event ? t("editTitle") : t("title")}
        className="modal-panel grid max-h-full w-full max-w-lg gap-3 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2"
      >
        <h2 className="font-semibold sm:col-span-2">{event ? t("editTitle") : t("title")}</h2>
        <input type="hidden" name="back" value={back} />
        {event && <input type="hidden" name="id" value={event.id} />}
        <input name="title" required autoFocus maxLength={200} defaultValue={event?.title} placeholder={t("titlePlaceholder")} className={`${inputCls} sm:col-span-2`} />
        <DateTimeInput name="starts_at" label={t("starts")} required defaultValue={startValue} />
        <DateTimeInput name="ends_at" label={t("ends")} defaultValue={endValue} />
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm sm:col-span-2">
          {t("allDay")}
          <input type="checkbox" name="all_day" role="switch" defaultChecked={event?.all_day} className="peer sr-only" />
          <span className="relative h-6 w-11 shrink-0 rounded-full bg-zinc-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 dark:bg-zinc-700 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
        </label>
        <label className="text-sm sm:col-span-2">{t("repeat")}
          <select name="repeat" defaultValue={event?.repeat ?? "none"} className={inputCls}>
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
        <LocationInput name="location" placeholder={t("location")} defaultValue={event?.location} />
                <input name="description" maxLength={2000} defaultValue={event?.description} placeholder={t("notes")} className={inputCls} />
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
              <input type="checkbox" name="groups" value={g.id} defaultChecked={groupIds.includes(g.id)} className="peer sr-only" />
              <span className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 hover:bg-zinc-100 peer-checked:hover:bg-blue-700 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {g.name}
              </span>
            </label>
          ))}
        </fieldset>
        {contacts.length > 0 && (
          <fieldset className="flex flex-wrap items-center gap-3 text-sm sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">{t("invite")}</legend>
            {contacts.map((c) => (
              <label key={c.id} className="cursor-pointer">
                <input type="checkbox" name="invitees" value={c.id} defaultChecked={event?.invitees.some((i) => i.user_id === c.id)} className="peer sr-only" />
                <span className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 hover:bg-zinc-100 peer-checked:hover:bg-blue-700 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>
              </label>
            ))}
            <p className="w-full text-xs text-zinc-500">{t("inviteHint")}</p>
          </fieldset>
        )}
        <ReminderPicker defaultValue={event?.reminders} />
        <div className="flex gap-2 sm:col-span-2">
          <button className={btnCls}>{t("save")}</button>
          <button type="button" onClick={onClose} className={btnGhostCls}>{t("cancel")}</button>
        </div>
      </form>
    </div>
  );
}
