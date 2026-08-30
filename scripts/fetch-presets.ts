import { existsSync, writeFileSync } from "node:fs";
import { fetchHeightGrid } from "../lib/elevation";

const PRESETS = [
  { slug: "tau", name: "Ta'ū", country: "American Samoa", lat: -14.235, lon: -169.455, span: 12 },
  { slug: "santorini", name: "Santorini", country: "Greece", lat: 36.404, lon: 25.43, span: 20 },
  { slug: "bora-bora", name: "Bora Bora", country: "French Polynesia", lat: -16.5, lon: -151.741, span: 14 },
  { slug: "heimaey", name: "Heimaey", country: "Iceland", lat: 63.436, lon: -20.267, span: 12 },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const index: unknown[] = [];
  let fetched = 0;
  for (const p of PRESETS) {
    const file = `data/islands/${p.slug}.json`;
    if (existsSync(file)) {
      const g = JSON.parse(String(await import("node:fs").then((m) => m.readFileSync(file))));
      index.push({ ...p, max: g.max, landFraction: g.landFraction });
      console.log(`${p.name}: cached`);
      continue;
    }
    if (fetched > 0) {
      console.log("  waiting 90s for the rate-limit window…");
      await sleep(90_000);
    }
    fetched++;
    const grid = await fetchHeightGrid(p.lat, p.lon, 24, p.span);
    writeFileSync(file, JSON.stringify(grid));
    index.push({ ...p, max: grid.max, landFraction: grid.landFraction });
    console.log(
      `${p.name}: ${grid.min}-${grid.max} m, land ${(grid.landFraction * 100).toFixed(0)}%`,
    );
  }
  writeFileSync("data/islands/index.json", JSON.stringify(index, null, 2));
  console.log("wrote data/islands/index.json");
}

main().catch((e) => {
  console.error("failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
