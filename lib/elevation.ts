import { fetchRetry } from "./fetchRetry";

const ENDPOINT = "https://api.open-meteo.com/v1/elevation";
const MAX_PER_REQUEST = 100;

export interface HeightGrid {
  n: number;
  spanKm: number;
  lat: number;
  lon: number;
  /** Row-major, n*n metres above sea level. */
  heights: number[];
  min: number;
  max: number;
  /** Fraction of samples above sea level — how much of the box is land. */
  landFraction: number;
}

async function fetchChunk(la: number[], lo: number[]): Promise<number[]> {
  const url = `${ENDPOINT}?latitude=${la.map((v) => v.toFixed(5)).join(",")}&longitude=${lo
    .map((v) => v.toFixed(5))
    .join(",")}`;
  const res = await fetchRetry(url, { next: { revalidate: 86400 } });
  const json = (await res.json()) as { elevation: number[] };
  return json.elevation;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Samples real elevation on an n x n grid centred on (lat, lon).
 * Open-Meteo's elevation API is free and needs no key, but caps each
 * request at 100 coordinate pairs, so this batches and parallelises.
 */
export async function fetchHeightGrid(
  lat: number,
  lon: number,
  n = 24,
  spanKm = 16,
): Promise<HeightGrid> {
  const dLat = spanKm / 111;
  const dLon = spanKm / (111 * Math.max(0.15, Math.cos((lat * Math.PI) / 180)));

  const lats: number[] = [];
  const lons: number[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      lats.push(lat + dLat * (r / (n - 1) - 0.5));
      lons.push(lon + dLon * (c / (n - 1) - 0.5));
    }
  }

  const chunks: [number[], number[]][] = [];
  for (let i = 0; i < lats.length; i += MAX_PER_REQUEST) {
    chunks.push([lats.slice(i, i + MAX_PER_REQUEST), lons.slice(i, i + MAX_PER_REQUEST)]);
  }

  // Open-Meteo tolerates ~6 back-to-back elevation calls before 429ing, so a
  // 24x24 grid (576 points = 6 calls) is the most real data we can pull in one go.
  const results: number[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    const [la, lo] = chunks[i];
    results.push(await fetchChunk(la, lo));
    if (i < chunks.length - 1) await sleep(140);
  }

  const heights = results.flat().map((h) => (Number.isFinite(h) ? h : 0));
  const land = heights.filter((h) => h > 0.5).length;

  return {
    n,
    spanKm,
    lat,
    lon,
    heights,
    min: Math.min(...heights),
    max: Math.max(...heights),
    landFraction: land / heights.length,
  };
}

/** Bilinear sample of the grid at normalised (u, v), both in [0, 1]. */
export function sampleGrid(g: HeightGrid, u: number, v: number): number {
  const n = g.n;
  const x = Math.min(n - 1.001, Math.max(0, u * (n - 1)));
  const y = Math.min(n - 1.001, Math.max(0, v * (n - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;

  const at = (r: number, c: number) => g.heights[r * n + c] ?? 0;
  const h00 = at(y0, x0);
  const h10 = at(y0, x0 + 1);
  const h01 = at(y0 + 1, x0);
  const h11 = at(y0 + 1, x0 + 1);

  // Smoothstep the weights so the coarse sample grid does not read as facets.
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  return (
    h00 * (1 - sx) * (1 - sy) +
    h10 * sx * (1 - sy) +
    h01 * (1 - sx) * sy +
    h11 * sx * sy
  );
}
