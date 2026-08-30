"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { DispatchPlan, IslandConfig } from "@/lib/types";

const W = 900;
const H = 200;
const PAD_L = 34;
const PAD_B = 22;
const PAD_T = 10;

const BANDS = [
  { key: "solarKw", color: "var(--color-solar)", label: "Solar" },
  { key: "windKw", color: "var(--color-wind)", label: "Wind" },
  { key: "batteryKw", color: "var(--color-battery)", label: "Battery" },
  { key: "dieselKw", color: "var(--color-diesel)", label: "Generator" },
] as const;

export default function Timeline({
  plan,
  island,
  hour,
  onHour,
  changedHours = [],
}: {
  plan: DispatchPlan;
  island: IslandConfig;
  hour: number;
  onHour: (h: number) => void;
  /** Hours where optimising changes what the island does. */
  changedHours?: number[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      // Check the preference directly rather than via gsap.matchMedia: tweens
      // created inside a matchMedia context are not owned by useGSAP, so its
      // cleanup never reverts them and a killed from() leaves the bars frozen
      // at scaleY 0.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const cols = gsap.utils.toArray<SVGGElement>(".hour-col");
      if (cols.length) {
        // Origin is set once, before the tween, so GSAP owns it outright.
        gsap.set(cols, { transformOrigin: "50% 100%" });
        gsap.fromTo(
          cols,
          { scaleY: 0 },
          {
            scaleY: 1,
            duration: 0.55,
            // A plain numeric stagger: the object form was swallowing the
            // tween's own ease and the bars grew at a constant rate, which is
            // what made the motion feel mechanical.
            ease: "power2.out",
            stagger: 0.018,
            overwrite: "auto",
          },
        );
      }

      const line = svgRef.current?.querySelector<SVGPathElement>(".tank-line");
      if (line) {
        const len = line.getTotalLength();
        gsap.fromTo(
          line,
          { strokeDasharray: len, strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            duration: 1.15,
            delay: 0.2,
            ease: "power2.inOut",
            overwrite: "auto",
            clearProps: "strokeDasharray,strokeDashoffset",
          },
        );
      }
    },
    { scope: svgRef, dependencies: [plan.label, plan.totals.dieselL, plan.totals.tankMinM3] },
  );

  const gw = W - PAD_L;
  const gh = H - PAD_B - PAD_T;
  const bw = gw / 24;

  const maxKw = Math.max(
    ...plan.hours.map(
      (h) => h.solarKw + h.windKw + Math.max(0, h.batteryKw) + h.dieselKw,
    ),
    1,
  );

  const tankPath = plan.hours
    .map((h, i) => {
      const x = PAD_L + i * bw + bw / 2;
      const y = PAD_T + gh - (h.tankM3 / island.tankM3) * gh;
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-tertiary">
        {BANDS.map((b) => (
          <span key={b.key} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-[2px]" style={{ background: b.color }} />
            {b.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="inline-block w-4 h-[2px]" style={{ background: "var(--color-water)" }} />
          Freshwater tank
        </span>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label="Hourly power sources across 24 hours with freshwater tank level">
        {plan.hours.map((h, i) => {
          let y = PAD_T + gh;
          const x = PAD_L + i * bw + bw * 0.16;
          const w = bw * 0.68;
          return (
            <g key={i} onClick={() => onHour(i)} style={{ cursor: "pointer" }}>
              <rect x={PAD_L + i * bw} y={PAD_T} width={bw} height={gh} fill="transparent" />
              <g className="hour-col">
              {BANDS.map((b) => {
                const raw = h[b.key] as number;
                const v = b.key === "batteryKw" ? Math.max(0, raw) : raw;
                if (v <= 0) return null;
                const bh = (v / maxKw) * gh;
                y -= bh;
                return (
                  <rect key={b.key} x={x} y={y} width={w} height={bh}
                    fill={b.color} opacity={i === hour ? 1 : 0.62} />
                );
              })}
              </g>
            </g>
          );
        })}

        {changedHours.map((h) => (
          <rect
            key={`chg-${h}`}
            x={PAD_L + h * bw + bw * 0.16}
            y={PAD_T + gh + 3}
            width={bw * 0.68}
            height={2.5}
            rx={1.25}
            fill="var(--color-brand-500)"
            opacity={0.85}
          >
            <title>Optimising changes this hour</title>
          </rect>
        ))}

        <path className="tank-line" d={tankPath} fill="none" stroke="var(--color-water)" strokeWidth={1.8} strokeLinejoin="round" />

        <line
          x1={PAD_L + hour * bw + bw / 2}
          x2={PAD_L + hour * bw + bw / 2}
          y1={PAD_T} y2={PAD_T + gh}
          stroke="currentColor" strokeWidth={1} opacity={0.45} className="text-primary"
          strokeDasharray="3 3"
        />

        <text x={PAD_L - 4} y={PAD_T + 8} textAnchor="start" fontSize={10} fill="currentColor" className="text-quaternary">
          {Math.round(maxKw)} kW
        </text>
        <text x={PAD_L - 7} y={PAD_T + gh} textAnchor="end" fontSize={10} fill="currentColor" className="text-quaternary">0</text>
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={PAD_L + h * bw + bw / 2} y={H - 6} textAnchor="middle"
            fontSize={10} fill="currentColor" className="text-quaternary">
            {h === 0 ? "12a" : h === 12 ? "noon" : h < 12 ? `${h}a` : `${h - 12}p`}
          </text>
        ))}
      </svg>
    </div>
  );
}
