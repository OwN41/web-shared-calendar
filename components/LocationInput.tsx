"use client";

import { useRef, useState } from "react";
import { inputCls } from "./ui";

export function LocationInput({ name, placeholder }: { name: string; placeholder: string }) {
  const [value, setValue] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ctrl = useRef<AbortController>(undefined);

  function search(q: string) {
    clearTimeout(timer.current);
    ctrl.current?.abort();
    if (q.trim().length < 3) {
      setOptions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const c = new AbortController();
      ctrl.current = c;
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: c.signal });
        const list: unknown = await res.json();
        setOptions(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
        setActive(-1);
      } catch {}
    }, 300);
  }

  function pick(o: string) {
    ctrl.current?.abort();
    clearTimeout(timer.current);
    setValue(o);
    setOptions([]);
  }

  return (
    <div className="relative">
      <input
        name={name}
        value={value}
        maxLength={200}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={options.length > 0}
        aria-controls="location-options"
        aria-autocomplete="list"
        className={inputCls}
        onChange={(e) => {
          setValue(e.target.value);
          search(e.target.value);
        }}
        onBlur={() => setOptions([])}
        onKeyDown={(e) => {
          if (options.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % options.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setOptions([]);
          }
        }}
      />
      {options.length > 0 && (
        <ul
          role="listbox"
          id="location-options"
          className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-auto rounded-md border border-zinc-200 bg-white text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {options.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              className={`cursor-pointer px-3 py-2 ${i === active ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
