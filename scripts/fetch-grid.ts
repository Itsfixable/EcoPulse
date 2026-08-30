import { writeFileSync } from "node:fs";
import { fetchHeightGrid } from "../lib/elevation";
import { TAU } from "../lib/island";

const [, , latArg, lonArg, out] = process.argv;
const lat = Number(latArg ?? TAU.lat);
const lon = Number(lonArg ?? TAU.lon);
const file = out ?? "data/tau-grid.json";

async function main() {
  const grid = await fetchHeightGrid(lat, lon, 24, 14);
  writeFileSync(file, JSON.stringify(grid));
  console.log(
    `wrote ${file}: ${grid.n}x${grid.n}, elevation ${grid.min}-${grid.max} m, land ${(grid.landFraction * 100).toFixed(0)}%`,
  );
}

main().catch((e) => {
  console.error("failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
