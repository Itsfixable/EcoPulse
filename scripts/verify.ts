import raw from "../data/tau-raw.json";
import { TAU } from "../lib/island";
import { normalize, type RawForecast } from "../lib/openmeteo";
import { compare, solve, loadKw } from "../lib/dispatch";
import type { DispatchPlan, IslandConfig } from "../lib/types";

const forecast = normalize(raw as RawForecast);
const cmp = compare(TAU, forecast);

function table(p: DispatchPlan) {
  console.log(`\n${p.label}`);
  console.log("  h   solar   wind    batt  diesel   soc   tank  note");
  for (const x of p.hours) {
    console.log(
      `  ${String(x.hour).padStart(2)}  ${f(x.solarKw)} ${f(x.windKw)} ${f(x.batteryKw)} ${f(x.dieselKw)}  ${(x.batterySoc * 100).toFixed(0).padStart(3)}%  ${x.tankM3.toFixed(0).padStart(4)}  ${x.note}`,
    );
  }
  const t = p.totals;
  console.log(
    `  → diesel ${t.dieselL.toFixed(0)} L · CO2 ${t.co2Kg.toFixed(0)} kg · renewable ${(t.renewableFraction * 100).toFixed(0)}% · critical outages ${t.criticalOutageHours} h · tank low ${t.tankMinM3.toFixed(0)} m³`,
  );
}
const f = (n: number) => n.toFixed(0).padStart(6);

table(cmp.naive);
table(cmp.ecopulse);

console.log(`\n=== HEADLINE ===`);
console.log(
  `Fixed schedule burns ${cmp.naive.totals.dieselL.toFixed(0)} L of diesel with ${cmp.naive.totals.criticalOutageHours} critical outage hours.`,
);
console.log(
  `EcoPulse burns ${cmp.ecopulse.totals.dieselL.toFixed(0)} L with ${cmp.ecopulse.totals.criticalOutageHours}.`,
);
console.log(
  `Saved ${cmp.dieselSavedL.toFixed(0)} L (${cmp.dieselSavedPct.toFixed(0)}%), ${cmp.co2SavedKg.toFixed(0)} kg CO2 avoided.`,
);

// ---- invariants ----
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) { failures++; console.log(`  FAIL  ${name} ${detail}`); }
  else console.log(`  pass  ${name}`);
};

console.log(`\n=== INVARIANTS ===`);
for (const plan of [cmp.naive, cmp.ecopulse]) {
  for (const x of plan.hours) {
    const supply = x.solarKw + x.windKw + Math.max(0, x.batteryKw) + x.dieselKw - x.curtailedKw + Math.min(0, x.batteryKw);
    const servedKw = x.demandKw - shedKw(TAU, x.shedLoadIds, x.hour);
    if (Math.abs(supply - servedKw) > 1.5) {
      failures++;
      console.log(`  FAIL  power balance ${plan.label} h${x.hour}: supply ${supply.toFixed(1)} vs served ${servedKw.toFixed(1)}`);
    }
  }
}
console.log(`  pass  power balance holds every hour (both plans)`);

check("battery stays within [0,1] SoC", [...cmp.naive.hours, ...cmp.ecopulse.hours].every((x) => x.batterySoc >= -1e-9 && x.batterySoc <= 1 + 1e-9));
check("diesel never exceeds fuel reserve", [...cmp.naive.hours, ...cmp.ecopulse.hours].every((x) => x.fuelRemainingL >= -1e-6));
check("tank never goes negative", [...cmp.naive.hours, ...cmp.ecopulse.hours].every((x) => x.tankM3 >= -1e-6));
check("EcoPulse tank never runs dry", !cmp.ecopulse.totals.tankRanDry, `(low ${cmp.ecopulse.totals.tankMinM3} m³)`);
check("EcoPulse never burns more diesel than fixed schedule", cmp.ecopulse.totals.dieselL <= cmp.naive.totals.dieselL + 1e-6, `(${cmp.ecopulse.totals.dieselL} vs ${cmp.naive.totals.dieselL})`);
check("no tier-1 load ever shed by EcoPulse", cmp.ecopulse.totals.unservedTier1Kwh === 0);

// degenerate: no sun, dead battery, empty fuel
const dark = forecast.map((f) => ({ ...f, ghi: 0, dni: 0, windMs: 0 }));
const broke: IslandConfig = { ...TAU, batteryStartSoc: 0.15, dieselFuelL: 0 };
const d = solve(broke, dark, "ecopulse");
check("degenerate scenario returns 24 coherent hours", d.hours.length === 24 && d.hours.every((x) => Number.isFinite(x.batterySoc)));

function shedKw(c: IslandConfig, ids: string[], hour: number) {
  return ids.reduce((s, id) => {
    const l = c.loads.find((x) => x.id === id);
    return s + (l ? loadKw(l, hour) : 0);
  }, 0);
}

console.log(failures ? `\n${failures} FAILURE(S)\n` : `\nAll invariants hold.\n`);
process.exit(failures ? 1 : 0);
