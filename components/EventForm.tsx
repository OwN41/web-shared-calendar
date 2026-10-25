import type { Group } from "@/lib/queries";
import { createEvent } from "@/lib/actions";
import { btnCls, inputCls, cardCls } from "./ui";

export function EventForm({
  groups,
  back,
  defaultGroupIds = [],
}: {
  groups: Group[];
  back: "/calendar" | "/shared";
  defaultGroupIds?: string[];
}) {
  return (
    <details className={cardCls}>
      <summary className="cursor-pointer font-medium">＋ New appointment</summary>
      <form action={createEvent} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="back" value={back} />
        <input name="title" required maxLength={200} placeholder="Title" className={`${inputCls} sm:col-span-2`} />
        <label className="text-sm">Starts
          <input type="datetime-local" name="starts_at" required className={inputCls} />
        </label>
        <label className="text-sm">Ends
          <input type="datetime-local" name="ends_at" className={inputCls} />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="all_day" /> All day (uses the start/end dates only)
        </label>
        <input name="location" maxLength={200} placeholder="Location" className={inputCls} />
        <input name="description" maxLength={2000} placeholder="Notes" className={inputCls} />
        {groups.length > 0 && (
          <fieldset className="flex flex-wrap items-center gap-3 text-sm sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">Share with</legend>
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-1">
                <input type="checkbox" name="groups" value={g.id} defaultChecked={defaultGroupIds.includes(g.id)} />
                {g.name}
              </label>
            ))}
          </fieldset>
        )}
        <div className="sm:col-span-2"><button className={btnCls}>Save appointment</button></div>
      </form>
    </details>
  );
}
