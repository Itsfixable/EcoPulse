import type {
  Comparison,
  DispatchPlan,
  ForecastHour,
  HourPlan,
  IslandConfig,
  Load,
  PlanTotals,
} from "./types";
import { solarKw, windKw } from "./generation";

export type Mode = "naive" | "ecopulse";

const NAIVE_SCHEDULE: Record<string, number[]> = {
  desal: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  ice: [8, 9, 10, 11, 12, 13, 14, 15],
};
const TANK_FLOOR_FRACTION = 0.12;

export function loadKw(l: Load, hour: number): number {
  return l.kw * (l.profile?.[hour] ?? 1);
}

function orderLoads(c: IslandConfig, priorityOrder?: string[]): Load[] {
  if (!priorityOrder?.length) return [...c.loads].sort((a, b) => a.tier - b.tier);
  const rank = new Map(priorityOrder.map((id, i) => [id, i]));
  return [...c.loads].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}

function runHoursFor(c: IslandConfig, l: Load): number {
  if (l.runHoursPerDay) return l.runHoursPerDay;
  if (l.makesWater) return Math.ceil((c.waterDemandM3PerHour * 24) / l.makesWater);
  return 0;
}

function schedules(
  c: IslandConfig,
  gen: { solar: number; wind: number }[],
  mode: Mode,
): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  const shiftable = c.loads.filter((l) => l.shiftable);

  if (mode === "naive") {
    for (const l of shiftable) out.set(l.id, new Set(NAIVE_SCHEDULE[l.id] ?? []));
    return out;
  }

  const baseAt = (h: number) =>
    c.loads.filter((l) => !l.shiftable).reduce((s, l) => s + loadKw(l, h), 0);
  const surplus = gen.map((g, h) => ({ h, s: g.solar + g.wind - baseAt(h) }));

  for (const l of shiftable) {
    const need = runHoursFor(c, l);
    const chosen = new Set(
      [...surplus].sort((a, b) => b.s - a.s).slice(0, need).map((x) => x.h),
    );

    if (l.makesWater) {
      const floor = c.tankM3 * TANK_FLOOR_FRACTION;
      for (let guard = 0; guard < 24; guard++) {
        let tank = c.tankStartM3;
        let breach = -1;
        for (let h = 0; h < 24; h++) {
          tank = Math.min(
            c.tankM3,
            tank + (chosen.has(h) ? l.makesWater : 0) - c.waterDemandM3PerHour,
          );
          if (tank < floor) { breach = h; break; }
        }
        if (breach < 0) break;
        const cand = surplus
          .filter((x) => x.h <= breach && !chosen.has(x.h))
          .sort((a, b) => b.s - a.s);
        if (!cand.length) break;
        chosen.add(cand[0].h);
      }
    }
    out.set(l.id, chosen);
  }
  return out;
}

export function solve(
  c: IslandConfig,
  forecast: ForecastHour[],
  mode: Mode,
  priorityOrder?: string[],
): DispatchPlan {
  const gen = forecast.map((f) => ({ solar: solarKw(c, f), wind: windKw(c, f) }));
  const sched = schedules(c, gen, mode);
  const ordered = orderLoads(c, priorityOrder);

  let soc = c.batteryStartSoc;
  let fuelL = c.dieselFuelL;
  let tank = c.tankStartM3;
  const hours: HourPlan[] = [];

  for (let h = 0; h < 24; h++) {
    const { solar, wind } = gen[h];
    let renewLeft = solar + wind;
    let batteryLeft = Math.min(
      Math.max(0, (soc - c.batteryReserveSoc) * c.batteryKwh),
      c.batteryMaxKw,
    );
    let dieselLeft = Math.min(c.dieselMaxKw, fuelL / c.dieselLPerKwh);

    const candidates = ordered.filter(
      (l) => !l.shiftable || sched.get(l.id)?.has(h),
    );

    // The operator's ordering is authoritative, not the static tier: the
    // generator backs only the highest-ranked loads, as many as there are
    // non-deferrable ones. Promote the ice plant and it displaces something
    // else from that protection.
    const dieselRankLimit = c.loads.filter((l) => !l.shiftable).length;

    const served: string[] = [];
    const shed: string[] = [];
    let usedBattery = 0;
    let usedDiesel = 0;
    let unservedTier1 = 0;

    for (const load of candidates) {
      const kw = loadKw(load, h);
      const rank = ordered.indexOf(load);
      const mayUseDiesel = mode === "naive" || rank < dieselRankLimit;
      const available = renewLeft + batteryLeft + (mayUseDiesel ? dieselLeft : 0);

      if (available + 1e-6 < kw) {
        shed.push(load.id);
        if (load.tier === 1) unservedTier1 += kw;
        continue;
      }
      let need = kw;
      const fromRenew = Math.min(renewLeft, need);
      renewLeft -= fromRenew; need -= fromRenew;
      const fromBattery = Math.min(batteryLeft, need);
      batteryLeft -= fromBattery; need -= fromBattery; usedBattery += fromBattery;
      if (need > 1e-9 && mayUseDiesel) {
        const fromDiesel = Math.min(dieselLeft, need);
        dieselLeft -= fromDiesel; need -= fromDiesel; usedDiesel += fromDiesel;
      }
      served.push(load.id);
    }

    const chargeRoom = Math.max(0, (1 - soc) * c.batteryKwh);
    const charged = Math.min(renewLeft, chargeRoom, c.batteryMaxKw);
    const curtailed = renewLeft - charged;

    soc = clamp01(soc + (charged - usedBattery) / c.batteryKwh);
    fuelL = Math.max(0, fuelL - usedDiesel * c.dieselLPerKwh);

    const desal = c.loads.find((l) => l.makesWater);
    const made = desal && served.includes(desal.id) ? desal.makesWater! : 0;
    tank = Math.max(0, Math.min(c.tankM3, tank + made - c.waterDemandM3PerHour));

    hours.push({
      hour: h,
      demandKw: r2(candidates.reduce((s, l) => s + loadKw(l, h), 0)),
      solarKw: r2(solar),
      windKw: r2(wind),
      batteryKw: r2(usedBattery - charged),
      dieselKw: r2(usedDiesel),
      curtailedKw: r2(curtailed),
      servedLoadIds: served,
      shedLoadIds: shed,
      unservedTier1Kwh: r2(unservedTier1),
      batterySoc: r3(soc),
      fuelRemainingL: r2(fuelL),
      tankM3: r2(tank),
      note: noteFor(made > 0, usedDiesel, shed, c),
    });
  }

  return {
    label: mode === "naive" ? "Fixed schedule" : "EcoPulse",
    hours,
    totals: totals(c, hours),
  };
}

function noteFor(madeWater: boolean, diesel: number, shed: string[], c: IslandConfig) {
  const bits: string[] = [];
  if (madeWater) bits.push("desalinating");
  if (diesel > 0.5) bits.push(`generator ${Math.round(diesel)} kW`);
  if (shed.length) {
    const names = shed.map((id) => c.loads.find((l) => l.id === id)?.name ?? id);
    bits.push(`paused ${names.join(", ").toLowerCase()}`);
  }
  return bits.length ? bits.join(" · ") : "renewables only";
}

function totals(c: IslandConfig, hours: HourPlan[]): PlanTotals {
  const dieselKwh = hours.reduce((s, x) => s + x.dieselKw, 0);
  const dieselL = dieselKwh * c.dieselLPerKwh;
  const renewServed = hours.reduce(
    (s, x) => s + Math.max(0, x.solarKw + x.windKw - x.curtailedKw),
    0,
  );
  const totalServed = renewServed + dieselKwh;
  const tankMin = Math.min(...hours.map((x) => x.tankM3));
  return {
    dieselL: r2(dieselL),
    co2Kg: r2(dieselL * c.dieselCo2PerL),
    renewableFraction: totalServed ? r3(renewServed / totalServed) : 1,
    unservedTier1Kwh: r2(hours.reduce((s, x) => s + x.unservedTier1Kwh, 0)),
    criticalOutageHours: hours.filter((x) => x.unservedTier1Kwh > 0).length,
    tankMinM3: r2(tankMin),
    tankRanDry: tankMin <= 0.01,
  };
}

export function compare(
  c: IslandConfig,
  forecast: ForecastHour[],
  priorityOrder?: string[],
): Comparison {
  const naive = solve(c, forecast, "naive", priorityOrder);
  const ecopulse = solve(c, forecast, "ecopulse", priorityOrder);
  const savedL = naive.totals.dieselL - ecopulse.totals.dieselL;
  return {
    naive,
    ecopulse,
    dieselSavedL: r2(savedL),
    dieselSavedPct: naive.totals.dieselL ? r2((savedL / naive.totals.dieselL) * 100) : 0,
    co2SavedKg: r2(naive.totals.co2Kg - ecopulse.totals.co2Kg),
    outagesAvoided: naive.totals.criticalOutageHours - ecopulse.totals.criticalOutageHours,
  };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
