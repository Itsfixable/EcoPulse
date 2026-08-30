"use client";

import { useState } from "react";
import type { IslandConfig } from "@/lib/types";

export default function PriorityList({
  island,
  order,
  onOrder,
  servedIds,
}: {
  island: IslandConfig;
  order: string[];
  onOrder: (o: string[]) => void;
  servedIds: string[];
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onOrder(next);
  };

  return (
    <ol className="space-y-1.5">
      {order.map((id, i) => {
        const load = island.loads.find((l) => l.id === id)!;
        const on = servedIds.includes(id);
        return (
          <li
            key={id}
            draggable
            onDragStart={() => setDragId(id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragId && dragId !== id) move(order.indexOf(dragId), i);
            }}
            onDragEnd={() => setDragId(null)}
            className={`flex cursor-grab items-center gap-2.5 rounded-lg px-2.5 py-2 ring-1 transition active:cursor-grabbing ${
              dragId === id ? "bg-secondary ring-brand" : "ring-secondary hover:bg-secondary"
            } ${on ? "opacity-100" : "opacity-45"}`}
          >
            <span className="tnum w-4 text-xs text-quaternary">{i + 1}</span>
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: on ? "var(--color-brand-500)" : "var(--color-fg-quaternary)" }}
            />
            <span className="flex-1 text-sm text-primary">{load.name}</span>
            <span className="tnum text-xs text-tertiary">{load.kw} kW</span>
            <span className="rounded px-1.5 py-0.5 text-xs text-quaternary ring-1 ring-secondary">
              T{load.tier}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
