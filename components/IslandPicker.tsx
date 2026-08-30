"use client";

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
  onPick: (p: PresetIsland) => void;
}) {
  return (
    <div className="island-picker">
      <span className="island-picker-label">Island</span>

      <div className="island-picker-options" role="group" aria-label="Choose an island">
        {presets.map((p) => {
          const active = current === p.name;
          return (
            <button
              key={p.slug}
              onClick={() => onPick(p)}
              disabled={busy}
              aria-pressed={active}
              className={`island-chip${active ? " is-active" : ""}`}
            >
              <span className="island-chip-name">{p.name}</span>
              <span className="island-chip-country">{p.country}</span>
            </button>
          );
        })}
      </div>

      {busy && <span className="island-picker-note">sampling terrain…</span>}
      {error && <span className="island-picker-error">{error}</span>}
    </div>
  );
}
