"use client";

import { useRef, useState } from "react";
import { inputCls } from "./ui";

function toText(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : "";
}

function toIso(text: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(text);
  if (!m) return "";
  const [, dd, mm, yyyy, hh, mi] = m;
  const d = new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi));
  const valid =
    d.getUTCFullYear() === +yyyy && d.getUTCMonth() === +mm - 1 && d.getUTCDate() === +dd && +hh < 24 && +mi < 60;
  return valid ? `${yyyy}-${mm}-${dd}T${hh}:${mi}` : "";
}

/** Auto-inserts the separators of dd/MM/yyyy HH:mm while typing digits. */
function mask(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 12);
  let out = d.slice(0, 2);
  if (d.length > 2) out += `/${d.slice(2, 4)}`;
  if (d.length > 4) out += `/${d.slice(4, 8)}`;
  if (d.length > 8) out += ` ${d.slice(8, 10)}`;
  if (d.length > 10) out += `:${d.slice(10, 12)}`;
  return out;
}

export function DateTimeInput({
  name,
  defaultValue,
  required,
  label,
}: {
  name: string;
  defaultValue: string;
  required?: boolean;
  label: string;
}) {
  const [text, setText] = useState(toText(defaultValue));
  const picker = useRef<HTMLInputElement>(null);
  const iso = toIso(text);

  return (
    <div className="text-sm">
      <label>
        {label}
        <input type="hidden" name={name} value={iso} />
        <div className="relative">
          <input
            value={text}
            required={required}
            inputMode="numeric"
            placeholder="dd/MM/yyyy HH:mm"
            maxLength={16}
            pattern="\d{2}/\d{2}/\d{4} \d{2}:\d{2}"
            onChange={(e) => setText(mask(e.target.value))}
            className={`${inputCls} pr-9`}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={label}
            onClick={() => picker.current?.showPicker()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
          </button>
          <input
            ref={picker}
            type="datetime-local"
            tabIndex={-1}
            aria-hidden
            value={iso}
            onChange={(e) => e.target.value && setText(toText(e.target.value))}
            className="pointer-events-none absolute right-0 top-full h-0 w-0 opacity-0"
          />
        </div>
      </label>
    </div>
  );
}
