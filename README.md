# EcoPulse

**An intelligent automation system that reads live environmental data and schedules energy and water on an isolated island.**

Built for DreamHacks 2026 at Georgia Tech — Track 2, *AI, Automation & Logic*.

> On an island, electricity and drinking water are the same resource. Every litre costs
> kilowatt-hours. When the sun goes down, you are choosing between light and water.
> EcoPulse makes that choice hourly — and shows its work.

---

## The problem

Ta'ū, American Samoa runs on solar, wind, a battery bank, and a diesel generator with a finite
fuel reserve. Its desalination plant is simultaneously the island's **largest movable electrical
load** and its **only source of drinking water**. You cannot simply shed it when power is tight —
the tank drains. Electricity and fresh water are one coupled constraint.

## What EcoPulse does

It pulls the real hourly weather forecast for the island, models what the panels and turbine will
actually produce, and solves a 24-hour dispatch plan that decides — for every hour — where each
kilowatt goes and when to make water.

Against the same forecast, on the same island:

| | Diesel | CO₂ | Critical outages | Tank low point |
|---|---|---|---|---|
| Fixed schedule (baseline) | 303 L | 812 kg | 0 h | 255 m³ |
| **EcoPulse** | **179 L** | **480 kg** | **0 h** | **255 m³** |

**41% less diesel. 332 kg of CO₂ avoided. No critical load ever shed, and the tank never runs dry.**

## How it works

| Layer | What it does |
|---|---|
| **Environment** | Live hourly forecast from Open-Meteo — GHI, DNI, wind at 80 m, cloud cover |
| **Generation model** | Irradiance → kW; wind speed → kW through a power curve with cut-in/cut-out |
| **Dispatch solver** | Priority-tiered dispatch, battery arbitrage, and water coupling over 24 h |
| **Automation** | The plan re-solves itself whenever conditions change — no button |
| **AI** | Claude explains the solver's reasoning and re-runs it under what-if conditions |
| **3D island** | Terrain, sources and loads, with power flowing along animated arcs |

### The algorithm

Loads are tiered — tier 1 (clinic, water pumps, comms) is never shed; tier 2 is homes and the
school; tier 3 (desalination, ice plant) is deferrable. The objective is lexicographic: minimise
unserved tier 1, then keep the water tank above its floor, then minimise diesel, then minimise
unserved tier 2 — subject to hourly power balance, battery capacity and rate limits, and the fuel
reserve.

It runs in two stages, and the difference between them is the headline number:

1. **Greedy pass** — serve loads in priority order from renewables, then battery, then generator,
   with desalination on a fixed daytime schedule. This is the baseline.
2. **Refinement pass** — shift deferrable loads into forecast-surplus hours and pre-charge the
   battery ahead of forecast deficits, subject to the tank floor. Tier-3 load is never run on
   diesel.

### Ethics, made explicit

A system that rations power is making a moral judgement about who matters. Rather than bury that
in a constant, the load priority list is **editable in the UI** — drag the school above the
desalination plant and the entire day re-solves instantly. The algorithm does the maths; people
decide what matters.

## Verification

The solver ships with executable invariants:

```bash
npx tsx scripts/verify.ts
```

It prints both 24-hour plans and asserts that power balance holds every hour, the battery stays
within capacity and rate limits, diesel never exceeds the fuel reserve, the tank never goes
negative, tier 1 is never shed, and **the optimised plan never burns more diesel than the
baseline on any seed**.

## What is real, and what is modelled

- **Real:** the weather. A live Open-Meteo forecast for Ta'ū (−14.23, −169.45), cached locally so
  a demo never depends on a third-party API being up.
- **Modelled:** the island's load profile and hardware specifications, based on published
  island-microgrid figures.
- **Not claimed:** there is no integration with physical inverters or hardware.

## Running it

```bash
npm install
npm run dev
```

The assistant needs an Anthropic API key. Everything else works without one.

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env.local
```

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Untitled UI (React Aria) ·
React Three Fiber · Anthropic Claude API · Open-Meteo
