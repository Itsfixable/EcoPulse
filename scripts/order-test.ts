import raw from "../data/tau-raw.json";
import { TAU } from "../lib/island";
import { normalize, type RawForecast } from "../lib/openmeteo";
import { compare } from "../lib/dispatch";

const forecast = normalize(raw as RawForecast);
const base = ["clinic", "pumps", "comms", "homes", "school", "desal", "ice"];

const swap = (a: number, b: number) => {
  const o = [...base];
  [o[a], o[b]] = [o[b], o[a]];
  return o;
};

const cases: [string, string[]][] = [
  ["baseline (tier order)", base],
  ["swap clinic <-> pumps", swap(0, 1)],
  ["swap homes <-> school", swap(3, 4)],
  ["school above homes+comms", ["clinic", "pumps", "school", "comms", "homes", "desal", "ice"]],
  ["desal one step up", ["clinic", "pumps", "comms", "homes", "desal", "school", "ice"]],
  ["desal two steps up", ["clinic", "pumps", "comms", "desal", "homes", "school", "ice"]],
  ["ice to the very top", ["ice", "clinic", "pumps", "comms", "homes", "school", "desal"]],
  ["clinic to the bottom", ["pumps", "comms", "homes", "school", "desal", "ice", "clinic"]],
];

for (const [label, order] of cases) {
  const p = compare(TAU, forecast, order).ecopulse;
  const shed = p.hours.filter((h) => h.shedLoadIds.length).length;
  console.log(
    `${label.padEnd(26)} diesel ${p.totals.dieselL.toFixed(0).padStart(4)} | outage h ${p.totals.criticalOutageHours} | shed h ${shed} | tank ${p.totals.tankMinM3.toFixed(0)}`,
  );
}
