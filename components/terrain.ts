export const ISLAND_R = 6;
const PEAK = 3.1;

export function islandHeight(x: number, z: number): number {
  const r = Math.sqrt(x * x + z * z) / ISLAND_R;
  if (r >= 1) return -0.18;
  const base = Math.pow(1 - r, 1.7);
  const ridge = 0.62 + 0.38 * Math.sin(x * 0.85 + 1.3) * Math.cos(z * 0.72 - 0.4);
  const detail = 0.14 * Math.sin(x * 3.1) * Math.cos(z * 2.7);
  return Math.max(-0.18, base * PEAK * ridge + base * detail);
}

export interface Site {
  id: string;
  label: string;
  x: number;
  z: number;
  kind: "source" | "load";
  color: string;
}

export const SITES: Site[] = [
  { id: "solar", label: "Solar array", x: -2.9, z: -1.7, kind: "source", color: "#f0a03c" },
  { id: "wind", label: "Wind turbine", x: 2.6, z: -2.6, kind: "source", color: "#3fbfa8" },
  { id: "battery", label: "Battery bank", x: 0.6, z: -0.4, kind: "source", color: "#7b8ff5" },
  { id: "generator", label: "Generator", x: 2.2, z: 1.9, kind: "source", color: "#d4674a" },
  { id: "clinic", label: "Health clinic", x: -1.4, z: 1.5, kind: "load", color: "#e8eef5" },
  { id: "pumps", label: "Water pumps", x: 0.1, z: 2.5, kind: "load", color: "#e8eef5" },
  { id: "comms", label: "Comms tower", x: -3.1, z: 0.9, kind: "load", color: "#e8eef5" },
  { id: "homes", label: "Homes", x: -1.9, z: 2.6, kind: "load", color: "#e8eef5" },
  { id: "school", label: "School", x: -2.6, z: -0.2, kind: "load", color: "#e8eef5" },
  { id: "desal", label: "Desalination", x: 3.2, z: 0.6, kind: "load", color: "#4aa3d4" },
  { id: "ice", label: "Ice plant", x: 3.4, z: -0.9, kind: "load", color: "#e8eef5" },
];

export function siteY(s: { x: number; z: number }) {
  return Math.max(0.05, islandHeight(s.x, s.z));
}
