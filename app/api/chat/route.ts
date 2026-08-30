import { NextResponse } from "next/server";
import { TAU } from "@/lib/island";
import { compare } from "@/lib/dispatch";
import { applyScenario, BASE_SCENARIO, type Scenario } from "@/lib/scenario";
import { chat, detectProvider, providerLabel, type ToolSpec } from "@/lib/llm";
import type { ForecastHour } from "@/lib/types";

export const runtime = "nodejs";

const SET_SCENARIO: ToolSpec = {
  name: "set_scenario",
  description:
    "Re-run the island's dispatch plan under changed physical conditions. Call this whenever the user asks a what-if about weather, equipment failure, fuel supply, or extra demand.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      label: { type: "string", description: "Short scenario name, e.g. 'Cyclone Ana'" },
      pvFactor: { type: "number", description: "Solar output multiplier 0-1. Heavy cloud ~0.35, panel damage lower." },
      windFactor: { type: "number", description: "Wind output multiplier 0-1. Turbine offline = 0." },
      batteryFactor: { type: "number", description: "Battery capacity multiplier 0-1." },
      fuelL: { type: "number", description: "Litres of diesel available. Use -1 to keep the normal reserve." },
      extraLoadKw: { type: "number", description: "Extra critical load in kW, e.g. an emergency shelter. 0 if none." },
    },
    required: ["label", "pvFactor", "windFactor", "batteryFactor", "fuelL", "extraLoadKw"],
  },
};

/** The model sends -1 rather than null, since not every provider allows nullable types. */
function toScenario(raw: unknown): Scenario {
  const r = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  const fuel = num(r.fuelL, -1);
  return {
    label: typeof r.label === "string" && r.label.trim() ? r.label : "What-if",
    pvFactor: clamp(num(r.pvFactor, 1), 0, 1),
    windFactor: clamp(num(r.windFactor, 1), 0, 1),
    batteryFactor: clamp(num(r.batteryFactor, 1), 0, 1),
    fuelL: fuel < 0 ? null : fuel,
    extraLoadKw: Math.max(0, num(r.extraLoadKw, 0)),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function brief(forecast: ForecastHour[], scenario: Scenario) {
  const cmp = compare(applyScenario(TAU, scenario), forecast);
  const p = cmp.ecopulse;
  const rows = p.hours
    .map(
      (h) =>
        `${String(h.hour).padStart(2, "0")}:00 solar ${Math.round(h.solarKw)}kW wind ${Math.round(h.windKw)}kW battery ${Math.round(h.batteryKw)}kW generator ${Math.round(h.dieselKw)}kW soc ${Math.round(h.batterySoc * 100)}% tank ${Math.round(h.tankM3)}m3 — ${h.note}`,
    )
    .join("\n");
  return `SCENARIO: ${scenario.label}
ECOPULSE PLAN: ${p.totals.dieselL.toFixed(0)} L diesel, ${p.totals.co2Kg.toFixed(0)} kg CO2, ${Math.round(p.totals.renewableFraction * 100)}% renewable, ${p.totals.criticalOutageHours} critical outage hours, tank low ${p.totals.tankMinM3.toFixed(0)} m3.
FIXED-SCHEDULE BASELINE: ${cmp.naive.totals.dieselL.toFixed(0)} L diesel, ${cmp.naive.totals.criticalOutageHours} critical outage hours.
HOURLY:
${rows}`;
}

const SYSTEM = `You are the operations assistant for EcoPulse, a microgrid controller for Ta'u, American Samoa.

The island runs on solar, one wind turbine, a battery bank, and a diesel generator with a finite fuel reserve. Desalination is both the largest deferrable electrical load and the island's only source of drinking water, so electricity and fresh water are the same constrained resource.

Loads are tiered. Tier 1 is the health clinic, water pumps and comms tower, and is never shed. Tier 2 is homes and the school. Tier 3 is desalination and the ice plant, which the solver shifts into hours of forecast surplus.

You are given the solver's actual hourly output. Ground every claim in those numbers and quote them. Never invent figures. Be concise: two or three sentences unless asked for more. Explain scheduling decisions in plain language a village council member would follow.

The weather is a real Open-Meteo forecast. The load and hardware figures are modelled. If asked what is real, say exactly that and do not overclaim.

When the user poses a what-if, call set_scenario, then interpret the returned numbers against the normal plan.`;

export async function POST(req: Request) {
  const { messages, forecast, scenario } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    forecast: ForecastHour[];
    scenario: Scenario;
  };

  const active = scenario ?? BASE_SCENARIO;
  let applied: Scenario | null = null;

  try {
    const { reply, model } = await chat({
      system: SYSTEM,
      messages: [
        { role: "user", content: `Current plan:\n${brief(forecast, active)}` },
        { role: "assistant", content: "Understood — I have the current plan." },
        ...messages,
      ],
      tool: SET_SCENARIO,
      runTool: (input) => {
        applied = toScenario(input);
        return brief(forecast, applied);
      },
    });

    return NextResponse.json({
      reply,
      scenario: applied,
      provider: model ?? providerLabel(detectProvider()),
    });
  } catch (e) {
    return NextResponse.json({
      reply: `The assistant hit an error: ${e instanceof Error ? e.message : "unknown"}.`,
      provider: providerLabel(detectProvider()),
    });
  }
}
