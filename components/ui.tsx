export const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900";
export const btnCls =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 hover:shadow active:scale-[0.97] disabled:opacity-50";
export const btnGhostCls =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition hover:bg-zinc-100 active:scale-[0.97] dark:border-zinc-700 dark:hover:bg-zinc-800";
export const btnDangerCls =
  "rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 active:scale-[0.97] dark:border-red-900 dark:hover:bg-red-950";
export const cardCls =
  "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900";

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {message}
    </p>
  );
}
