import Dashboard from "@/components/Dashboard";
import { TAU } from "@/lib/island";
import { normalize, fetchForecast, type RawForecast } from "@/lib/openmeteo";
import cachedForecast from "@/data/tau-raw.json";
import cachedGrid from "@/data/islands/tau.json";
import presets from "@/data/islands/index.json";
import type { HeightGrid } from "@/lib/elevation";
import type { ForecastHour } from "@/lib/types";
import type { PresetIsland } from "@/components/IslandPicker";

export const revalidate = 900;

export default async function Page() {
  let forecast: ForecastHour[];
  let live = true;
  try {
    forecast = await fetchForecast(TAU);
  } catch {
    forecast = normalize(cachedForecast as RawForecast);
    live = false;
  }

  return (
    <Dashboard
      island={TAU}
      forecast={forecast}
      grid={cachedGrid as HeightGrid}
      presets={presets as PresetIsland[]}
      live={live}
    />
  );
}
