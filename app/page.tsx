import Dashboard from "@/components/Dashboard";
import { TAU } from "@/lib/island";
import { normalize, fetchForecast, type RawForecast } from "@/lib/openmeteo";
import cached from "@/data/tau-raw.json";
import type { ForecastHour } from "@/lib/types";

export const revalidate = 900;

export default async function Page() {
  let forecast: ForecastHour[];
  let live = true;
  try {
    forecast = await fetchForecast(TAU);
  } catch {
    forecast = normalize(cached as RawForecast);
    live = false;
  }
  return <Dashboard island={TAU} forecast={forecast} live={live} />;
}
