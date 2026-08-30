"use client";

import type { ReactNode } from "react";
import { cx } from "@/utils/cx";
import { useCountUp } from "./useCountUp";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cx(
        "rounded-xl bg-primary ring-1 ring-secondary shadow-xs",
        padded && "p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHead({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-primary">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-tertiary">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Metric({
  label,
  value,
  decimals = 0,
  unit,
  sub,
  tone = "neutral",
  accent = "var(--color-brand-500)",
}: {
  label: string;
  value: number;
  decimals?: number;
  unit?: string;
  sub: string;
  tone?: "good" | "warn" | "neutral";
  accent?: string;
}) {
  const countRef = useCountUp(value, decimals);
  return (
    <div className="metric-card" style={{ ["--accent" as string]: accent }}>
      <span className="metric-rule" aria-hidden="true" />
      <p className="metric-label">{label}</p>
      <p className="metric-value">
        <span ref={countRef} className="tnum">
          {value.toFixed(decimals)}
        </span>
        {unit && <span className="metric-unit">{unit}</span>}
      </p>
      <p
        className={cx(
          "metric-sub",
          tone === "good" && "text-success-primary",
          tone === "warn" && "text-warning-primary",
        )}
      >
        {sub}
      </p>
    </div>
  );
}
