"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { compare } from "@/lib/dispatch";
import Timeline from "./Timeline";
import PriorityList from "./PriorityList";
import IslandPicker, { type PresetIsland } from "./IslandPicker";
import EcoBot from "./EcoBot";
import SceneClock from "./SceneClock";
import { Card, CardHead, Metric } from "./ui";
import { buildTerrain, placeSites } from "./terrain";
import type { HeightGrid } from "@/lib/elevation";
import type { ForecastHour, IslandConfig } from "@/lib/types";

const IslandScene = dynamic(() => import("./IslandScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-xs text-tertiary">
      building terrain…
    </div>
  ),
});

export default function Dashboard({
  island,
  forecast: initialForecast,
  grid: initialGrid,
  presets,
  live,
}: {
  island: IslandConfig;
  forecast: ForecastHour[];
  grid: HeightGrid;
  presets: PresetIsland[];
  live: boolean;
}) {
  const [grid, setGrid] = useState(initialGrid);
  const [forecast, setForecast] = useState(initialForecast);
  const [placeName, setPlaceName] = useState(presets[0]?.name ?? island.name);
  const [placeCountry, setPlaceCountry] = useState(presets[0]?.country ?? "");
  const [islandBusy, setIslandBusy] = useState(false);
  const [islandError, setIslandError] = useState<string | null>(null);
  const [staleWeather, setStaleWeather] = useState(false);

  const terrain = useMemo(() => buildTerrain(grid), [grid]);
  const sites = useMemo(() => placeSites(terrain), [terrain]);

  async function pickIsland(p: {
    slug?: string;
    name: string;
    country: string;
    lat: number;
    lon: number;
    span: number;
  }) {
    setIslandBusy(true);
    setIslandError(null);
    try {
      // Presets ship with elevation already sampled; only a search costs API calls.
      const url = p.slug
        ? `/api/preset?slug=${p.slug}`
        : `/api/island?lat=${p.lat}&lon=${p.lon}&span=${p.span ?? 16}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "could not load that island");
      setGrid(data.grid);
      if (data.forecast) {
        setForecast(data.forecast);
        setStaleWeather(false);
      } else {
        setStaleWeather(true);
      }
      setPlaceName(p.name);
      setPlaceCountry(p.country);
    } catch (e) {
      setIslandError(
        e instanceof Error && e.message.includes("429")
          ? "Elevation service is rate-limited. Try again in a minute."
          : "Could not load that island.",
      );
    } finally {
      setIslandBusy(false);
    }
  }

  const [hour, setHour] = useState(13);
  const hourIndex = Math.min(23, Math.max(0, Math.round(hour)));
  const [playing, setPlaying] = useState(false);
  const [order, setOrder] = useState<string[]>(() =>
    [...island.loads].sort((a, b) => a.tier - b.tier).map((l) => l.id),
  );

  const defaultOrder = useMemo(
    () => [...island.loads].sort((a, b) => a.tier - b.tier).map((l) => l.id),
    [island],
  );
  const cmp = useMemo(() => compare(island, forecast, order), [island, forecast, order]);
  const baseline = useMemo(
    () => compare(island, forecast, defaultOrder),
    [island, forecast, defaultOrder],
  );
  const dieselDelta = Math.round(
    cmp.ecopulse.totals.dieselL - baseline.ecopulse.totals.dieselL,
  );
  const plan = cmp.ecopulse;
  const now = plan.hours[hourIndex];

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setHour((h) => (h + 0.25) % 24), 90);
    return () => clearInterval(t);
  }, [playing]);

  // Re-count the metrics whenever the plan changes, so a reorder reads as a
  // recalculation rather than numbers silently swapping.
  const shell = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".metric-card");
        if (cards.length) {
          gsap.fromTo(
            cards,
            { y: 8, opacity: 0.35 },
            { y: 0, opacity: 1, duration: 0.72, ease: "power3.out", stagger: 0.08 },
          );
        }
      });
      return () => mm.revert();
    },
    { scope: shell, dependencies: [plan.totals.dieselL, order.join(",")] },
  );

  return (
    <div ref={shell} className="min-h-screen bg-secondary">

      <main className="mx-auto max-w-[1480px] px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="display text-lg text-primary">Island control</h1>
          <span className="text-sm text-tertiary">
            {placeName}
            {placeCountry ? `, ${placeCountry}` : ""}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-secondary ring-1 ring-secondary">
            <span
              className="size-1.5 rounded-full"
              style={{
                background:
                  staleWeather || !live ? "var(--color-solar)" : "var(--color-brand-500)",
              }}
            />
            {staleWeather ? "Weather service busy" : live ? "Live forecast" : "Cached forecast"}
          </span>
        </div>

        <div className="mb-6 max-w-3xl">
          <p className="display text-xl leading-snug text-primary sm:text-display-xs">
            On an island, electricity and drinking water are the same resource.
          </p>
          <p className="mt-2 text-sm text-tertiary">
            Desalination is the largest movable load on Ta&apos;ū and the only source of fresh
            water. EcoPulse reads the live weather forecast and schedules the whole island, hour
            by hour, so the clinic never goes dark and the tank never runs dry.
          </p>
        </div>

        <div className="mb-4">
          <IslandPicker
            presets={presets}
            current={placeName}
            busy={islandBusy}
            error={islandError}
            onPick={pickIsland}
          />
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            label="Diesel burned today"
            accent="var(--color-diesel)"
            value={plan.totals.dieselL}
            unit="L"
            sub={
              cmp.dieselSavedPct > 0
                ? `${Math.round(cmp.dieselSavedPct)}% less than a fixed schedule`
                : "same as a fixed schedule"
            }
            tone={cmp.dieselSavedPct > 0 ? "good" : "neutral"}
          />
          <Metric
            label="CO₂ avoided"
            accent="var(--color-wind)"
            value={cmp.co2SavedKg}
            unit="kg"
            sub={`baseline burns ${Math.round(cmp.naive.totals.dieselL)} L`}
            tone={cmp.co2SavedKg > 0 ? "good" : "neutral"}
          />
          <Metric
            label="Critical outages"
            accent="var(--color-brand-500)"
            value={plan.totals.criticalOutageHours}
            unit="hrs"
            sub="clinic, pumps and comms"
            tone={plan.totals.criticalOutageHours === 0 ? "good" : "warn"}
          />
          <Metric
            label="Tank low point"
            accent="var(--color-water)"
            value={plan.totals.tankMinM3}
            unit="m³"
            sub={plan.totals.tankRanDry ? "ran dry" : "never ran dry"}
            tone={plan.totals.tankRanDry ? "warn" : "good"}
          />
          <Metric
            label="Renewable share"
            accent="var(--color-solar)"
            value={plan.totals.renewableFraction * 100}
            unit="%"
            sub="of energy served"
            tone="good"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-8">
            <Card padded={false} className="overflow-hidden">
              <div className="relative h-[520px]">
                <IslandScene plan={now} terrain={terrain} sites={sites} island={island} />
                <div className="pointer-events-none absolute left-4 top-4 max-w-[55%]">
                  <p className="text-xs text-tertiary">{now.note}</p>
                </div>
                <div className="pointer-events-none absolute right-4 top-4">
                  <SceneClock hour={hour} />
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-secondary px-4 py-3">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary ring-1 ring-secondary transition hover:bg-secondary hover:text-primary"
                >
                  {playing ? "Pause" : "Play day"}
                </button>
                <input
                  type="range"
                  min={0}
                  max={23.99}
                  step={0.01}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  aria-label="Hour of day"
                  className="h-1.5 w-full flex-1 cursor-pointer appearance-none rounded-full bg-quaternary accent-brand-solid"
                />

              </div>
            </Card>

            <Card>
              <CardHead
                title="Dispatch plan"
                hint="Where every kilowatt comes from, and what it costs the water tank"
              />
              <Timeline plan={plan} island={island} hour={hour} onHour={setHour} />
            </Card>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4">
            <Card>
              <CardHead title="Who gets power first" hint="Drag to reorder. The day re-solves instantly." />
              <PriorityList
                island={island}
                order={order}
                onOrder={setOrder}
                servedIds={now.servedLoadIds}
              />
              <p
                className={`priority-delta${dieselDelta === 0 ? " is-neutral" : ""}`}
                aria-live="polite"
              >
                {dieselDelta === 0 ? (
                  <>This ordering costs the same fuel as the tiered default.</>
                ) : dieselDelta > 0 ? (
                  <>
                    This ordering burns <strong>{dieselDelta} L more diesel</strong> today than the
                    tiered default. Putting industry above people has a price, and it is this.
                  </>
                ) : (
                  <>
                    This ordering saves <strong>{Math.abs(dieselDelta)} L of diesel</strong> today
                    against the tiered default.
                  </>
                )}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-tertiary">
                An automated system that rations power is making an ethical choice. We exposed the
                choice instead of hiding it in a constant. The algorithm does the maths, people
                decide what matters.
              </p>
            </Card>
          </div>
        </div>

        <footer className="mt-6 text-xs text-tertiary">
          {staleWeather
            ? "Terrain updated, but the weather service was busy, so the forecast shown is from the previous island. "
            : ""}
          Terrain is real elevation sampled from Open-Meteo at {grid.n}&times;{grid.n} points
          across a {grid.spanKm} km box ({grid.lat.toFixed(3)}, {grid.lon.toFixed(3)}), peak{" "}
          {Math.round(grid.max)} m. Weather is a live forecast for the same point. Load and
          hardware figures are modelled on published island-microgrid data.
        </footer>
      </main>

      <EcoBot forecast={forecast} />
    </div>
  );
}
