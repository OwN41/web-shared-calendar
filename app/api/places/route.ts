import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";

type Feature = {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    country?: string;
  };
};

function label(p: Feature["properties"]) {
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  const city = [p.postcode, p.city].filter(Boolean).join(" ");
  const parts = [p.name, street, city, p.country].filter(Boolean) as string[];
  return parts.filter((x, i) => parts.indexOf(x) === i).join(", ");
}

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return Response.json([], { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 200) return Response.json([]);

  const lang = (await getLocale()) === "de" ? "de" : "en";
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=${lang}`,
      { headers: { "User-Agent": "web-shared-calendar" }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return Response.json([]);
    const data = (await res.json()) as { features?: Feature[] };
    const labels = (data.features ?? []).map((f) => label(f.properties)).filter(Boolean);
    return Response.json([...new Set(labels)]);
  } catch {
    return Response.json([]);
  }
}
