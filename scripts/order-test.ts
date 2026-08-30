import raw from "../data/tau-raw.json";
import { TAU } from "../lib/island";
import { normalize, type RawForecast } from "../lib/openmeteo";
import { compare } from "../lib/dispatch";

const forecast = normalize(raw as RawForecast);

const orders: [string, string[]][] = [
  ["default (tier order)", ["clinic", "pumps", "comms", "homes", "school", "desal", "ice"]],
  ["school above desal", ["clinic", "pumps", "comms", "school", "homes", "desal", "ice"]],
  ["desal first", ["desal", "clinic", "pumps", "comms", "homes", "school", "ice"]],
  ["ice + desal above people", ["ice", "desal", "clinic", "pumps", "comms", "homes", "school"]],
  ["homes last", ["clinic", "pumps", "comms", "school", "desal", "ice", "homes"]],
];

for (const [label, order] of orders) {
  const c = compare(TAU, forecast, order);
  const p = c.ecopulse;
  const shedHours = p.hours.filter((h) => h.shedLoadIds.length).length;
  console.log(
    `${label.padEnd(26)} diesel ${p.totals.dieselL.toFixed(0).padStart(4)} L | outages ${p.totals.criticalOutageHours} | tank low ${p.totals.tankMinM3.toFixed(0).padStart(3)} | hours with a shed load ${shedHours}`,
  );
}
