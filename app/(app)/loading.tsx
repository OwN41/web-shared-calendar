export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-busy="true">
      <div className="h-7 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
