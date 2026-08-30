"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { BASE_SCENARIO, describe, type Scenario } from "@/lib/scenario";
import type { ForecastHour } from "@/lib/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Why is the generator running before dawn?",
  "What if a cyclone knocks out the wind turbine?",
  "Is this real data?",
];

export default function Assistant({
  forecast,
  scenario,
  onScenario,
}: {
  forecast: ForecastHour[];
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: text.trim() }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, forecast, scenario }),
      });
      const data = await res.json();
      setMsgs([...next, { role: "assistant", content: data.reply }]);
      if (data.provider) setProvider(data.provider);
      if (data.scenario) onScenario(data.scenario);
    } catch {
      setMsgs([
        ...next,
        { role: "assistant", content: "Could not reach the assistant." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const mods = describe(scenario);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-secondary px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-primary">Operations assistant</h2>
          <p className="text-xs text-tertiary">
            Grounded in the solver&apos;s hourly output
            {provider && provider !== "offline" ? ` · ${provider}` : ""}
          </p>
        </div>
        {mods.length > 0 && (
          <button
            onClick={() => {
              onScenario(BASE_SCENARIO);
              setMsgs([]);
            }}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-tertiary ring-1 ring-secondary transition hover:text-secondary"
          >
            Reset
          </button>
        )}
      </div>

      {mods.length > 0 && (
        <div className="scenario-banner overflow-hidden border-b border-secondary bg-secondary px-4 py-2">
          <p className="text-xs text-secondary">
            <span className="font-semibold text-primary">{scenario.label}</span>
            {" — "}
            {mods.join(", ")}
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {msgs.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-tertiary">
              Ask why the plan does what it does, or pose a what-if — the assistant can re-run the
              solver under new conditions.
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-secondary ring-1 ring-secondary transition hover:bg-secondary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {msgs.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-6 rounded-lg rounded-br-sm bg-brand-solid px-3 py-2 text-sm text-white"
                : "mr-2 text-sm leading-relaxed text-secondary"
            }
          >
            {m.content}
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-1.5 text-sm text-tertiary">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex gap-2 border-t border-secondary p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about the plan…"
          aria-label="Message the operations assistant"
          className="min-w-0 flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-primary ring-1 ring-primary outline-none transition placeholder:text-placeholder focus:ring-2 focus:ring-brand"
        />
        <Button type="submit" size="sm" isDisabled={busy || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
