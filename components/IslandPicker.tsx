"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/lib/geocode";

export interface PresetIsland {
  slug: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  span: number;
}

export default function IslandPicker({
  presets,
  current,
  busy,
  error,
  onPick,
}: {
  presets: PresetIsland[];
  current: string;
  busy: boolean;
  error: string | null;
  onPick: (p: { slug?: string; name: string; country: string; lat: number; lon: number; span: number }) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { places: Place[] };
        setResults(data.places);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div ref={box} className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search any island…"
          aria-label="Search for an island"
          className="w-56 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary ring-1 ring-primary outline-none transition placeholder:text-placeholder focus:ring-2 focus:ring-brand"
        />
        {open && results.length > 0 && (
          <ul className="absolute left-0 top-full z-50 mt-1 max-h-72 w-80 overflow-y-auto rounded-lg bg-primary p-1 ring-1 ring-secondary shadow-lg">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                    onPick({
                      name: r.name,
                      country: r.country,
                      lat: r.lat,
                      lon: r.lon,
                      span: 16,
                    });
                  }}
                  className="flex w-full items-baseline gap-2 rounded-md px-2.5 py-2 text-left transition hover:bg-secondary"
                >
                  <span className="text-sm text-primary">{r.name}</span>
                  <span className="text-xs text-tertiary">{r.country}</span>
                  {r.elevation !== null && (
                    <span className="tnum ml-auto text-xs text-quaternary">
                      {Math.round(r.elevation)} m
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {presets.map((p) => (
        <button
          key={p.slug}
          onClick={() => onPick(p)}
          disabled={busy}
          className={`rounded-full px-2.5 py-1 text-xs transition disabled:opacity-40 ${
            current === p.name
              ? "bg-brand-solid text-white"
              : "text-secondary ring-1 ring-secondary hover:bg-secondary"
          }`}
        >
          {p.name}
        </button>
      ))}

      {busy && <span className="text-xs text-tertiary">sampling terrain…</span>}
      {error && <span className="text-xs text-error-primary">{error}</span>}
    </div>
  );
}
