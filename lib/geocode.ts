export interface Place {
  id: number;
  name: string;
  country: string;
  admin: string | null;
  lat: number;
  lon: number;
  elevation: number | null;
}

interface RawPlace {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
}

export async function searchPlaces(q: string, count = 6): Promise<Place[]> {
  if (!q.trim()) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    q.trim(),
  )}&count=${count}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: RawPlace[] };
  return (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    country: r.country ?? "",
    admin: r.admin1 ?? null,
    lat: r.latitude,
    lon: r.longitude,
    // Open-Meteo uses 9999 as a no-data sentinel.
    elevation: r.elevation === 9999 ? null : (r.elevation ?? null),
  }));
}
