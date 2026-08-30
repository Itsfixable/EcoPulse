import type { ForecastHour, IslandConfig } from "./types";

const BASE = "https://api.open-meteo.com/v1/forecast";

const VARS = [
  "shortwave_radiation",
  "direct_normal_irradiance",
  "wind_speed_80m",
  "cloud_cover",
  "temperature_2m",
].join(",");

export interface RawForecast {
  hourly: {
    time: string[];
    shortwave_radiation: number[];
    direct_normal_irradiance: number[];
    wind_speed_80m: number[];
    cloud_cover: number[];
    temperature_2m: number[];
  };
}

export function forecastUrl(c: IslandConfig): string {
  const q = new URLSearchParams({
    latitude: String(c.lat),
    longitude: String(c.lon),
    hourly: VARS,
    wind_speed_unit: "ms",
    forecast_days: "2",
    timezone: "Pacific/Pago_Pago",
  });
  return `${BASE}?${q}`;
}

export function normalize(raw: RawForecast, startIndex = 0): ForecastHour[] {
  const h = raw.hourly;
  const out: ForecastHour[] = [];
  for (let i = 0; i < 24; i++) {
    const j = startIndex + i;
    out.push({
      hour: i,
      iso: h.time[j],
      ghi: h.shortwave_radiation[j] ?? 0,
      dni: h.direct_normal_irradiance[j] ?? 0,
      windMs: h.wind_speed_80m[j] ?? 0,
      cloudPct: h.cloud_cover[j] ?? 0,
      tempC: h.temperature_2m[j] ?? 0,
    });
  }
  return out;
}

export async function fetchForecast(c: IslandConfig): Promise<ForecastHour[]> {
  const res = await fetch(forecastUrl(c), { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return normalize((await res.json()) as RawForecast);
}
