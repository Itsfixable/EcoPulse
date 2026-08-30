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
}: {
  label: string;
  value: number;
  decimals?: number;
  unit?: string;
  sub: string;
  tone?: "good" | "warn" | "neutral";
}) {
  const countRef = useCountUp(value, decimals);
  return (
    <div className="metric-card rounded-xl bg-primary p-4 ring-1 ring-secondary shadow-xs">
      <p className="text-xs font-medium text-tertiary">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span
          ref={countRef}
          className="tnum text-3xl font-semibold tracking-tight text-primary"
        >
          {value.toFixed(decimals)}
        </span>
        {unit && <span className="text-sm text-tertiary">{unit}</span>}
      </p>
      <p
        className={cx(
          "mt-1 text-xs",
          tone === "good" && "text-success-primary",
          tone === "warn" && "text-warning-primary",
          tone === "neutral" && "text-tertiary",
        )}
      >
        {sub}
      </p>
    </div>
  );
}
