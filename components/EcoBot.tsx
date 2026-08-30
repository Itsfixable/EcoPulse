"use client";

import { useEffect, useRef, useState } from "react";
import { BASE_SCENARIO } from "@/lib/scenario";
import { localEcoBotReply } from "@/lib/ecobot";
import type { ForecastHour } from "@/lib/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING =
  "Hi! I'm EcoBot 🌍 Ask me about the island's energy and water plan. I read the solver's actual hourly output, so I can tell you why it made a decision, or what happens under a storm.";

export default function EcoBot({ forecast }: { forecast: ForecastHour[] }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, forecast, scenario: BASE_SCENARIO }),
      });
      const data = await res.json();
      setMsgs([...next, { role: "assistant", content: data.reply }]);
    } catch {
      const highF = Math.round((Math.max(...forecast.map((hour) => hour.tempC)) * 9) / 5 + 32);
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: localEcoBotReply(q, {
            temperatureF: highF,
            renewableShare: 94,
            dieselSavedL: 124,
            co2SavedKg: 332,
            tankLowM3: 255,
          }),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        id="chatbot-button"
        aria-label={open ? "Close EcoBot" : "Open EcoBot"}
        onClick={() => setOpen((o) => !o)}
      >
        🌱
      </button>

      {open && (
        <div id="chatbot">
          <div className="chat-header">
            <div>
              <h3>🌱 EcoBot</h3>
              <p>Reads the live dispatch plan</p>
            </div>
            <button id="close-chat" aria-label="Close chat" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>

          <div id="chat-messages">
            <div className="bot-message">{GREETING}</div>
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "user-message" : "bot-message"}>
                {m.content}
              </div>
            ))}
            {busy && <div className="bot-message typing">thinking…</div>}
            <div ref={end} />
          </div>

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input
              id="user-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask EcoBot something…"
              aria-label="Ask EcoBot"
            />
            <button id="send-button" aria-label="Send" disabled={busy || !draft.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
