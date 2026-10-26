"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const PRESETS = [15, 30, 60, 1440, 10080];
const UNITS = { minutes: 1, hours: 60, days: 1440, weeks: 10080 } as const;
const MAX = 525_600;

type Unit = keyof typeof UNITS;

export function ReminderPicker({ defaultValue = [] }: { defaultValue?: number[] }) {
  const t = useTranslations("eventForm");
  const [selected, setSelected] = useState<number[]>(defaultValue);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<Unit>("minutes");

  const label = (m: number) => {
    if (m === 0) return t("atStart");
    if (m % 10080 === 0) return t("weeks", { n: m / 10080 });
    if (m % 1440 === 0) return t("days", { n: m / 1440 });
    if (m % 60 === 0) return t("hours", { n: m / 60 });
    return t("minutes", { n: m });
  };
  const toggle = (m: number) =>
    setSelected((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));

  const minutes = Math.round(Number(amount) * UNITS[unit]);
  const valid = amount !== "" && Number.isFinite(minutes) && minutes > 0 && minutes <= MAX;
  const add = () => {
    if (!valid) return;
    setSelected((s) => (s.includes(minutes) ? s : [...s, minutes]));
    setAmount("");
  };

  const options = [...new Set([...PRESETS, ...selected])].sort((a, b) => a - b);

  return (
    <fieldset className="space-y-2 text-sm sm:col-span-2">
      <legend className="mb-1 text-sm font-medium">{t("reminders")}</legend>
      {selected.map((m) => (
        <input key={m} type="hidden" name="reminders" value={m} />
      ))}
      <div className="flex flex-wrap gap-2">
        {options.map((m) => {
          const on = selected.includes(m);
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(m)}
              className={`rounded-full border px-3 py-1 transition ${
                on
                  ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                  : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {label(m)}
              {on && !PRESETS.includes(m) && <span aria-hidden> ×</span>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-nowrap items-center gap-2">
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          aria-label={t("customAmount")}
          placeholder={t("custom")}
          className="w-16 min-w-0 shrink rounded-md border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
          aria-label={t("customUnit")}
          className="min-w-0 rounded-md border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {(Object.keys(UNITS) as Unit[]).map((u) => (
            <option key={u} value={u}>{t(`unit.${u}`)}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!valid}
          className="shrink-0 whitespace-nowrap rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {t("addReminder")}
        </button>
      </div>
      <p className="text-xs text-zinc-500">{t("remindersHint")}</p>
    </fieldset>
  );
}
