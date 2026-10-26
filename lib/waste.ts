import type { CalEvent } from "./queries";

const PALETTE = ["#0d9488", "#7c3aed", "#db2777", "#ea580c", "#0891b2"];

const KNOWN: [RegExp, string][] = [
  [/bio/i, "#16a34a"],
  [/papier/i, "#2563eb"],
  [/gelb/i, "#bfb602"],
  [/grün|gruen/i, "#65a30d"],
  [/rest/i, "#52525b"],
];

function colorFor(type: string) {
  const known = KNOWN.find(([re]) => re.test(type));
  if (known) return known[1];
  let h = 0;
  for (const c of type) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function unescapeText(s: string) {
  return s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
}

export function parseIcs(text: string, ownerName: string): CalEvent[] {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const out: CalEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT" && cur) {
      const m = /(\d{4})(\d{2})(\d{2})/.exec(cur.DTSTART ?? "");
      const title = unescapeText(cur.SUMMARY ?? "");
      if (m && title) {
        const day = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
        out.push({
          id: `waste:${cur.UID ?? `${title}-${m[0]}`}`,
          occ: `waste:${cur.UID ?? `${title}-${m[0]}`}`,
          owner_id: "waste",
          owner_name: ownerName,
          owner_color: colorFor(title),
          title,
          description: "",
          location: "",
          starts_at: day,
          ends_at: day,
          all_day: true,
          repeat: "none",
          color: null,
          series_start: day,
          series_end: day,
          invitees: [],
          reminders: [],
          group_ids: [],
        });
      }
      cur = null;
    } else if (cur) {
      const i = line.indexOf(":");
      if (i > 0) cur[line.slice(0, i).split(";")[0]] = line.slice(i + 1);
    }
  }
  return out;
}

export async function collectionDates(from: Date, to: Date, ownerName: string): Promise<CalEvent[]> {
  const url = process.env.COLLECTION_DATES_URL;
  if (!url) return [];
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return parseIcs(await res.text(), ownerName)
      .filter((e) => e.starts_at >= from && e.starts_at < to)
      .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
  } catch {
    return [];
  }
}
