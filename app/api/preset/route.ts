import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { normalize, type RawForecast } from "@/lib/openmeteo";
import { fetchRetry } from "@/lib/fetchRetry";
import type { HeightGrid } from "@/lib/elevation";

export const runtime = "nodejs";

const VARS = [
  "shortwave_radiation",
  "direct_normal_irradiance",
  "wind_speed_80m",
  "cloud_cover",
  "temperature_2m",
].join(",");

/** Presets ship with their elevation already sampled, so only the forecast is live. */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "bad slug" }, { status: 400 });
  }

  let grid: HeightGrid;
  try {
    const file = path.join(process.cwd(), "data", "islands", `${slug}.json`);
    grid = JSON.parse(readFileSync(file, "utf8")) as HeightGrid;
  } catch {
    return NextResponse.json({ error: "unknown island" }, { status: 404 });
  }

  try {
    const q = new URLSearchParams({
      latitude: String(grid.lat),
      longitude: String(grid.lon),
      hourly: VARS,
      wind_speed_unit: "ms",
      forecast_days: "2",
      timezone: "auto",
    });
    // Two quick attempts only: terrain is the point of a preset switch, and a
    // long retry chain would stall the UI for half a minute.
    const res = await fetchRetry(
      `https://api.open-meteo.com/v1/forecast?${q}`,
      { next: { revalidate: 900 } },
      2,
    );
    return NextResponse.json({ grid, forecast: normalize((await res.json()) as RawForecast) });
  } catch {
    // Terrain still works even if the weather service is busy.
    return NextResponse.json({ grid, forecast: null });
  }
}
