import type { HeightGrid } from "@/lib/elevation";
import { sampleGrid } from "@/lib/elevation";

/** Half-width of the rendered terrain in scene units. */
export const HALF = 7;
/** Scene height of the tallest point on the island. */
const PEAK_UNITS = 2.6;
/** Floor so pancake-flat atolls still read as land rather than a disc. */
const MIN_PEAK_M = 60;

export interface TerrainModel {
  grid: HeightGrid;
  /** Metres of real elevation represented by one scene unit of height. */
  peakM: number;
  heightAt: (x: number, z: number) => number;
}

export function buildTerrain(grid: HeightGrid): TerrainModel {
  const peakM = Math.max(grid.max, MIN_PEAK_M);
  const { cu, cv, radius } = landFraming(grid);

  // Map the scene box onto the island rather than onto the sampled box, so an
  // island sitting in one corner of the search area still fills the frame.
  const zoom = radius * 1.25;

  const heightAt = (x: number, z: number) => {
    const u = cu + (x / HALF) * zoom;
    const v = cv + (z / HALF) * zoom;
    if (u < 0 || u > 1 || v < 0 || v > 1) return -0.2;
    const m = sampleGrid(grid, u, v);
    if (m <= 0) return -0.2;
    return (m / peakM) * PEAK_UNITS;
  };

  return { grid, peakM, heightAt };
}

/** Centroid and extent of land in normalised grid coordinates. */
function landFraming(g: HeightGrid) {
  const n = g.n;
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (g.heights[r * n + c] > 0.5) {
        sx += c / (n - 1);
        sy += r / (n - 1);
        count++;
      }
    }
  }
  if (!count) return { cu: 0.5, cv: 0.5, radius: 0.5 };

  const cu = sx / count;
  const cv = sy / count;

  let radius = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (g.heights[r * n + c] > 0.5) {
        const du = c / (n - 1) - cu;
        const dv = r / (n - 1) - cv;
        radius = Math.max(radius, Math.hypot(du, dv));
      }
    }
  }
  return { cu, cv, radius: Math.max(0.12, radius) };
}

export interface Site {
  id: string;
  label: string;
  kind: "source" | "load";
  color: string;
  x: number;
  z: number;
}

const SITE_DEFS: Omit<Site, "x" | "z">[] = [
  { id: "solar", label: "Solar array", kind: "source", color: "#f4a63c" },
  { id: "wind", label: "Wind turbine", kind: "source", color: "#37bfa4" },
  { id: "battery", label: "Battery bank", kind: "source", color: "#7d8ff7" },
  { id: "generator", label: "Generator", kind: "source", color: "#d8674a" },
  { id: "clinic", label: "Health clinic", kind: "load", color: "#e8eef5" },
  { id: "pumps", label: "Water pumps", kind: "load", color: "#e8eef5" },
  { id: "comms", label: "Comms tower", kind: "load", color: "#e8eef5" },
  { id: "homes", label: "Homes", kind: "load", color: "#e8eef5" },
  { id: "school", label: "School", kind: "load", color: "#e8eef5" },
  { id: "desal", label: "Desalination", kind: "load", color: "#45a5d8" },
  { id: "ice", label: "Ice plant", kind: "load", color: "#e8eef5" },
];

/**
 * Picks well-separated land positions using farthest-point sampling, so the
 * same eleven sites land sensibly on any island the user searches for.
 */
export function placeSites(t: TerrainModel): Site[] {
  const candidates: { x: number; z: number }[] = [];
  const step = (2 * HALF) / 48;
  for (let x = -HALF + step; x < HALF; x += step) {
    for (let z = -HALF + step; z < HALF; z += step) {
      if (t.heightAt(x, z) > 0.04) candidates.push({ x, z });
    }
  }

  if (candidates.length < SITE_DEFS.length) {
    // Almost no land in view — fall back to a ring so the scene still reads.
    return SITE_DEFS.map((d, i) => {
      const a = (i / SITE_DEFS.length) * Math.PI * 2;
      return { ...d, x: Math.cos(a) * 2.6, z: Math.sin(a) * 2.6 };
    });
  }

  const picked: { x: number; z: number }[] = [];
  // Seed at the point furthest from open water, i.e. the highest ground.
  let best = candidates[0];
  let bestH = -Infinity;
  for (const c of candidates) {
    const h = t.heightAt(c.x, c.z);
    if (h > bestH) { bestH = h; best = c; }
  }
  picked.push(best);

  while (picked.length < SITE_DEFS.length) {
    let far = candidates[0];
    let farD = -Infinity;
    for (const c of candidates) {
      let d = Infinity;
      for (const p of picked) {
        d = Math.min(d, (c.x - p.x) ** 2 + (c.z - p.z) ** 2);
      }
      if (d > farD) { farD = d; far = c; }
    }
    picked.push(far);
  }

  return SITE_DEFS.map((d, i) => ({ ...d, x: picked[i].x, z: picked[i].z }));
}

export function siteY(t: TerrainModel, s: { x: number; z: number }) {
  return Math.max(0.05, t.heightAt(s.x, s.z));
}
