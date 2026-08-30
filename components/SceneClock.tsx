"use client";

/** Small analogue clock for the scene corner. Accepts fractional hours. */
/** Rounded so the server and client render byte-identical SVG coordinates;
 *  raw float math differs in the last digit and trips hydration. */
const r3 = (n: number) => Number(n.toFixed(3));

export default function SceneClock({ hour }: { hour: number }) {
  const h = ((hour % 24) + 24) % 24;
  const minutes = (h % 1) * 60;
  const hourAngle = ((h % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;
  const day = h >= 6 && h < 18;

  const label =
    h < 1
      ? "12"
      : h < 13
        ? String(Math.floor(h) || 12)
        : String(Math.floor(h) - 12);
  const meridiem = h < 12 ? "am" : "pm";

  return (
    <div className="scene-clock" aria-label={`Island time ${label}:${String(Math.floor(minutes)).padStart(2, "0")} ${meridiem}`}>
      <svg viewBox="0 0 44 44" width="44" height="44" role="img" aria-hidden="true">
        <circle
          cx="22"
          cy="22"
          r="20"
          fill={day ? "rgba(244,184,96,0.11)" : "rgba(120,140,190,0.12)"}
          stroke={day ? "rgba(244,184,96,0.55)" : "rgba(159,180,221,0.5)"}
          strokeWidth="1.2"
        />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const r1 = i % 3 === 0 ? 15 : 16.6;
          return (
            <line
              key={i}
              x1={r3(22 + Math.sin(a) * r1)}
              y1={r3(22 - Math.cos(a) * r1)}
              x2={r3(22 + Math.sin(a) * 18)}
              y2={r3(22 - Math.cos(a) * 18)}
              stroke={day ? "rgba(244,184,96,0.6)" : "rgba(159,180,221,0.55)"}
              strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
              strokeLinecap="round"
            />
          );
        })}
        <line
          x1="22" y1="22"
          x2={r3(22 + Math.sin((hourAngle * Math.PI) / 180) * 9)}
          y2={r3(22 - Math.cos((hourAngle * Math.PI) / 180) * 9)}
          stroke={day ? "#f6f1e7" : "#dfe6f5"}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <line
          x1="22" y1="22"
          x2={r3(22 + Math.sin((minuteAngle * Math.PI) / 180) * 13.5)}
          y2={r3(22 - Math.cos((minuteAngle * Math.PI) / 180) * 13.5)}
          stroke={day ? "rgba(246,241,231,0.75)" : "rgba(223,230,245,0.7)"}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="22" cy="22" r="1.6" fill={day ? "#f4b860" : "#9fb4dd"} />
      </svg>
      <span className="scene-clock-text">
        {label}:{String(Math.floor(minutes)).padStart(2, "0")}
        <em>{meridiem}</em>
      </span>
    </div>
  );
}
