import type { IslandConfig } from "./types";

export interface Scenario {
  label: string;
  pvFactor: number;
  windFactor: number;
  batteryFactor: number;
  fuelL: number | null;
  extraLoadKw: number;
}

export const BASE_SCENARIO: Scenario = {
  label: "Normal operations",
  pvFactor: 1,
  windFactor: 1,
  batteryFactor: 1,
  fuelL: null,
  extraLoadKw: 0,
};

export function applyScenario(c: IslandConfig, s: Scenario): IslandConfig {
  const loads = s.extraLoadKw
    ? [
        ...c.loads,
        {
          id: "surge",
          name: "Emergency shelter",
          tier: 1 as const,
          kw: s.extraLoadKw,
          shiftable: false,
        },
      ]
    : c.loads;

  return {
    ...c,
    pvKwp: c.pvKwp * s.pvFactor,
    windRatedKw: c.windRatedKw * s.windFactor,
    batteryKwh: c.batteryKwh * s.batteryFactor,
    batteryMaxKw: c.batteryMaxKw * s.batteryFactor,
    dieselFuelL: s.fuelL ?? c.dieselFuelL,
    loads,
  };
}

export function describe(s: Scenario): string[] {
  const out: string[] = [];
  if (s.pvFactor !== 1) out.push(`solar at ${Math.round(s.pvFactor * 100)}%`);
  if (s.windFactor !== 1)
    out.push(s.windFactor === 0 ? "wind offline" : `wind at ${Math.round(s.windFactor * 100)}%`);
  if (s.batteryFactor !== 1) out.push(`battery at ${Math.round(s.batteryFactor * 100)}%`);
  if (s.fuelL !== null) out.push(`${s.fuelL} L fuel`);
  if (s.extraLoadKw) out.push(`+${s.extraLoadKw} kW shelter load`);
  return out;
}
