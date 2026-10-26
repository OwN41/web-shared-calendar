"use client";

import { useEffect, useRef, useState } from "react";

export function Dropdown({
  summary,
  summaryClassName,
  title,
  ariaLabel,
  wrapperClassName,
  panelClassName,
  closeOnSelect = false,
  children,
}: {
  summary: React.ReactNode;
  summaryClassName: string;
  title: string;
  ariaLabel: string;
  wrapperClassName: string;
  panelClassName: string;
  closeOnSelect?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = () => setClosing(true);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: Event) => {
      if (!(e.target instanceof Node && ref.current?.contains(e.target))) setClosing(true);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setClosing(true);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = open && !closing;

  return (
    <div ref={ref} className={wrapperClassName}>
      <button
        type="button"
        title={title}
        aria-label={ariaLabel}
        aria-expanded={visible}
        onClick={() => (visible ? close() : (setClosing(false), setOpen(true)))}
        className={summaryClassName}
      >
        {summary}
      </button>
      {open && (
        <div
          data-snapshot-skip
          className={`${panelClassName} ${closing ? "popup-leave" : "popup-enter"}`}
          onClick={(e) => closeOnSelect && e.target instanceof Element && e.target.closest("button") && close()}
          onAnimationEnd={() => {
            if (closing) {
              setOpen(false);
              setClosing(false);
            }
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
