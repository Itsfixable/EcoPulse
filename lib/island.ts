import type { IslandConfig } from "./types";

// Households peak morning and evening, dip overnight and midday.
const HOME_PROFILE = [
  0.55, 0.5, 0.48, 0.48, 0.52, 0.68, 0.88, 1.0, 0.92, 0.8, 0.72, 0.7,
  0.72, 0.72, 0.75, 0.82, 0.95, 1.15, 1.3, 1.28, 1.15, 0.95, 0.75, 0.62,
];
const SCHOOL_PROFILE = [
  0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.4, 0.9, 1.0, 1.0, 1.0, 1.0,
  1.0, 1.0, 0.9, 0.5, 0.25, 0.15, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
];

export const TAU: IslandConfig = {
  name: "Ta'ū, American Samoa",
  lat: -14.23,
  lon: -169.45,

  pvKwp: 1410,
  pvEfficiency: 0.85,

  windRatedKw: 250,
  windCutInMs: 3.5,
  windRatedMs: 12,
  windCutOutMs: 25,

  batteryKwh: 2500,
  batteryMaxKw: 900,
  batteryStartSoc: 0.55,
  batteryReserveSoc: 0.15,

  dieselMaxKw: 800,
  dieselFuelL: 2000,
  dieselLPerKwh: 0.28,
  dieselCo2PerL: 2.68,

  tankM3: 500,
  tankStartM3: 300,
  waterDemandM3PerHour: 5,

  loads: [
    { id: "clinic", name: "Health clinic", tier: 1, kw: 40, shiftable: false },
    { id: "pumps", name: "Water pumps", tier: 1, kw: 60, shiftable: false },
    { id: "comms", name: "Comms tower", tier: 1, kw: 15, shiftable: false },
    { id: "homes", name: "Homes", tier: 2, kw: 260, shiftable: false, profile: HOME_PROFILE },
    { id: "school", name: "School", tier: 2, kw: 70, shiftable: false, profile: SCHOOL_PROFILE },
    { id: "desal", name: "Desalination", tier: 3, kw: 220, shiftable: true, makesWater: 12 },
    { id: "ice", name: "Ice plant", tier: 3, kw: 120, shiftable: true, runHoursPerDay: 8 },
  ],
};
