import type { ForecastHour, IslandConfig } from "./types";

export function solarKw(c: IslandConfig, f: ForecastHour): number {
  const irradianceFraction = Math.max(0, f.ghi) / 1000;
  return round2(c.pvKwp * irradianceFraction * c.pvEfficiency);
}

export function windKw(c: IslandConfig, f: ForecastHour): number {
  const v = Math.max(0, f.windMs);
  if (v < c.windCutInMs || v >= c.windCutOutMs) return 0;
  if (v >= c.windRatedMs) return c.windRatedKw;
  const cut = c.windCutInMs ** 3;
  const frac = (v ** 3 - cut) / (c.windRatedMs ** 3 - cut);
  return round2(c.windRatedKw * frac);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
