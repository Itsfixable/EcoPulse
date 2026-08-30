"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { compare } from "@/lib/dispatch";
import { applyScenario, BASE_SCENARIO, type Scenario } from "@/lib/scenario";
import Timeline from "./Timeline";
import PriorityList from "./PriorityList";
import Assistant from "./Assistant";
import { Card, CardHead, Metric } from "./ui";
import type { ForecastHour, IslandConfig } from "@/lib/types";

const IslandScene = dynamic(() => import("./IslandScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-xs text-tertiary">
      building terrain…
    </div>
  ),
});

const clock = (h: number) =>
  h === 0 ? "12:00 am" : h === 12 ? "12:00 pm" : h < 12 ? `${h}:00 am` : `${h - 12}:00 pm`;

export default function Dashboard({
  island,
  forecast,
  live,
}: {
  island: IslandConfig;
  forecast: ForecastHour[];
  live: boolean;
}) {
  const [hour, setHour] = useState(13);
  const [playing, setPlaying] = useState(false);
  const [scenario, setScenario] = useState<Scenario>(BASE_SCENARIO);
  const [order, setOrder] = useState<string[]>(() =>
    [...island.loads].sort((a, b) => a.tier - b.tier).map((l) => l.id),
  );

  const config = useMemo(() => applyScenario(island, scenario), [island, scenario]);
  const cmp = useMemo(() => compare(config, forecast, order), [config, forecast, order]);
  const plan = cmp.ecopulse;
  const now = plan.hours[hour];

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setHour((h) => (h + 1) % 24), 850);
    return () => clearInterval(t);
  }, [playing]);

  return (
    <div className="min-h-screen bg-secondary">
      <header className="sticky top-0 z-30 border-b border-secondary bg-primary/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand-solid text-sm font-bold text-white">
            E
          </span>
          <h1 className="text-md font-semibold text-primary">EcoPulse</h1>
          <span className="hidden text-sm text-tertiary sm:inline">{island.name}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-secondary ring-1 ring-secondary">
            <span
              className="size-1.5 rounded-full"
              style={{ background: live ? "var(--color-brand-500)" : "var(--color-solar)" }}
            />
            {live ? "Live forecast" : "Cached forecast"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-6 py-6">
        <div className="mb-6 max-w-3xl">
          <p className="text-xl leading-snug font-medium tracking-tight text-primary sm:text-display-xs">
            On an island, electricity and drinking water are the same resource.
          </p>
          <p className="mt-2 text-sm text-tertiary">
            Desalination is the largest movable load on Ta&apos;ū and the only source of fresh
            water. EcoPulse reads the live weather forecast and schedules the whole island — hour
            by hour — so the clinic never goes dark and the tank never runs dry.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            label="Diesel burned today"
            value={String(Math.round(plan.totals.dieselL))}
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
            value={String(Math.round(cmp.co2SavedKg))}
            unit="kg"
            sub={`baseline burns ${Math.round(cmp.naive.totals.dieselL)} L`}
            tone={cmp.co2SavedKg > 0 ? "good" : "neutral"}
          />
          <Metric
            label="Critical outages"
            value={String(plan.totals.criticalOutageHours)}
            unit="hrs"
            sub="clinic, pumps and comms"
            tone={plan.totals.criticalOutageHours === 0 ? "good" : "warn"}
          />
          <Metric
            label="Tank low point"
            value={String(Math.round(plan.totals.tankMinM3))}
            unit="m³"
            sub={plan.totals.tankRanDry ? "ran dry" : "never ran dry"}
            tone={plan.totals.tankRanDry ? "warn" : "good"}
          />
          <Metric
            label="Renewable share"
            value={String(Math.round(plan.totals.renewableFraction * 100))}
            unit="%"
            sub="of energy served"
            tone="good"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-8">
            <Card padded={false} className="overflow-hidden">
              <div className="relative h-[430px]">
                <IslandScene plan={now} />
                <div className="pointer-events-none absolute left-4 top-4">
                  <p className="text-xs font-medium text-secondary">Island at {clock(hour)}</p>
                  <p className="mt-0.5 text-xs text-tertiary">{now.note}</p>
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
                  max={23}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  aria-label="Hour of day"
                  className="h-1.5 w-full flex-1 cursor-pointer appearance-none rounded-full bg-quaternary accent-brand-solid"
                />
                <span className="tnum w-[72px] shrink-0 text-right text-xs text-tertiary">
                  {clock(hour)}
                </span>
              </div>
            </Card>

            <Card>
              <CardHead
                title="Dispatch plan"
                hint="Where every kilowatt comes from, and what it costs the water tank"
              />
              <Timeline plan={plan} island={config} hour={hour} onHour={setHour} />
            </Card>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4">
            <Card padded={false} className="flex h-[430px] flex-col overflow-hidden">
              <Assistant forecast={forecast} scenario={scenario} onScenario={setScenario} />
            </Card>

            <Card>
              <CardHead title="Who gets power first" hint="Drag to reorder — the day re-solves instantly" />
              <PriorityList
                island={config}
                order={order}
                onOrder={setOrder}
                servedIds={now.servedLoadIds}
              />
              <p className="mt-3 text-xs leading-relaxed text-tertiary">
                An automated system that rations power is making an ethical choice. We exposed the
                choice instead of hiding it in a constant — the algorithm does the maths, people
                decide what matters.
              </p>
            </Card>
          </div>
        </div>

        <footer className="mt-6 text-xs text-tertiary">
          Weather is a live Open-Meteo forecast for Ta&apos;ū ({island.lat}, {island.lon}). Load
          and hardware figures are modelled on published island-microgrid data.
        </footer>
      </main>
    </div>
  );
}
