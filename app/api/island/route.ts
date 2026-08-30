import { NextResponse } from "next/server";
import { fetchHeightGrid } from "@/lib/elevation";
import { normalize, type RawForecast } from "@/lib/openmeteo";
import { fetchRetry } from "@/lib/fetchRetry";

const VARS = [
  "shortwave_radiation",
  "direct_normal_irradiance",
  "wind_speed_80m",
  "cloud_cover",
  "temperature_2m",
].join(",");

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  const spanKm = Number(p.get("span") ?? 16);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  try {
    const [grid, forecast] = await Promise.all([
      fetchHeightGrid(lat, lon, 24, spanKm),
      (async () => {
        const q = new URLSearchParams({
          latitude: String(lat),
          longitude: String(lon),
          hourly: VARS,
          wind_speed_unit: "ms",
          forecast_days: "2",
          timezone: "auto",
        });
        const res = await fetchRetry(`https://api.open-meteo.com/v1/forecast?${q}`, {
          next: { revalidate: 900 },
        });
        return normalize((await res.json()) as RawForecast);
      })(),
    ]);

    return NextResponse.json({ grid, forecast });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 502 },
    );
  }
}
