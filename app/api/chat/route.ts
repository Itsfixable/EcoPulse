import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { TAU } from "@/lib/island";
import { compare } from "@/lib/dispatch";
import { applyScenario, BASE_SCENARIO, type Scenario } from "@/lib/scenario";
import type { ForecastHour } from "@/lib/types";

export const runtime = "nodejs";

const SET_SCENARIO: Anthropic.Tool = {
  name: "set_scenario",
  description:
    "Re-run the island's dispatch plan under changed physical conditions. Call this whenever the user asks a what-if about weather, equipment failure, fuel supply, or extra demand.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      label: { type: "string", description: "Short scenario name, e.g. 'Cyclone Ana'" },
      pvFactor: { type: "number", description: "Solar output multiplier 0-1. Heavy cloud ~0.35." },
      windFactor: { type: "number", description: "Wind output multiplier 0-1. Turbine offline = 0." },
      batteryFactor: { type: "number", description: "Battery capacity multiplier 0-1." },
      fuelL: { type: ["number", "null"], description: "Litres of diesel available, null for normal reserve." },
      extraLoadKw: { type: "number", description: "Extra critical load in kW, e.g. an emergency shelter." },
    },
    required: ["label", "pvFactor", "windFactor", "batteryFactor", "fuelL", "extraLoadKw"],
  },
  strict: true,
};

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

The weather is a real Open-Meteo forecast for Ta'u. The load and hardware figures are modelled. If asked what is real, say exactly that and do not overclaim.

When the user poses a what-if, call set_scenario, then interpret the returned numbers against the normal plan.`;

const MODEL = "claude-opus-5";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      reply:
        "No ANTHROPIC_API_KEY is set, so the assistant is offline. Add one to .env.local and restart the dev server. Everything else on this page works without it.",
    });
  }

  const { messages, forecast, scenario } = (await req.json()) as {
    messages: Msg[];
    forecast: ForecastHour[];
    scenario: Scenario;
  };

  const client = new Anthropic();
  const active = scenario ?? BASE_SCENARIO;

  const convo: Anthropic.MessageParam[] = [
    { role: "user", content: `Current plan:\n${brief(forecast, active)}` },
    { role: "assistant", content: "Understood — I have the current plan." },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const ask = () =>
    client.messages.create({
      model: MODEL,
      max_tokens: 1400,
      system: SYSTEM,
      output_config: { effort: "low" },
      tools: [SET_SCENARIO],
      messages: convo,
    });

  try {
    let res = await ask();
    let applied: Scenario | null = null;
    let guard = 0;

    while (res.stop_reason === "tool_use" && guard++ < 3) {
      const call = res.content.find((b) => b.type === "tool_use");
      if (!call || call.type !== "tool_use") break;
      const next = call.input as Scenario;
      applied = next;
      convo.push({ role: "assistant", content: res.content });
      convo.push({
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: call.id, content: brief(forecast, next) },
        ],
      });
      res = await ask();
    }

    const reply = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    return NextResponse.json({ reply, scenario: applied });
  } catch (e) {
    return NextResponse.json({
      reply: `The assistant hit an error: ${e instanceof Error ? e.message : "unknown"}.`,
    });
  }
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}
