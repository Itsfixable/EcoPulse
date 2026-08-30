export type Tier = 1 | 2 | 3;

export interface ForecastHour {
  hour: number;
  iso: string;
  ghi: number;
  dni: number;
  windMs: number;
  cloudPct: number;
  tempC: number;
}

export interface Load {
  id: string;
  name: string;
  tier: Tier;
  kw: number;
  shiftable: boolean;
  makesWater?: number;
  profile?: number[];
  runHoursPerDay?: number;
}

export interface IslandConfig {
  name: string;
  lat: number;
  lon: number;
  pvKwp: number;
  pvEfficiency: number;
  windRatedKw: number;
  windCutInMs: number;
  windRatedMs: number;
  windCutOutMs: number;
  batteryKwh: number;
  batteryMaxKw: number;
  batteryStartSoc: number;
  batteryReserveSoc: number;
  dieselMaxKw: number;
  dieselFuelL: number;
  dieselLPerKwh: number;
  dieselCo2PerL: number;
  tankM3: number;
  tankStartM3: number;
  waterDemandM3PerHour: number;
  loads: Load[];
}

export interface HourPlan {
  hour: number;
  demandKw: number;
  solarKw: number;
  windKw: number;
  batteryKw: number;
  dieselKw: number;
  curtailedKw: number;
  servedLoadIds: string[];
  shedLoadIds: string[];
  unservedTier1Kwh: number;
  batterySoc: number;
  fuelRemainingL: number;
  tankM3: number;
  note: string;
}

export interface PlanTotals {
  dieselL: number;
  co2Kg: number;
  renewableFraction: number;
  unservedTier1Kwh: number;
  criticalOutageHours: number;
  tankMinM3: number;
  tankRanDry: boolean;
}

export interface DispatchPlan {
  label: string;
  hours: HourPlan[];
  totals: PlanTotals;
}

export interface Comparison {
  naive: DispatchPlan;
  ecopulse: DispatchPlan;
  dieselSavedL: number;
  dieselSavedPct: number;
  co2SavedKg: number;
  outagesAvoided: number;
}
