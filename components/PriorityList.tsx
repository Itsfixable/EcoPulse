"use client";

import { useState } from "react";
import { LoadIcon, loadAccent } from "./loadIcons";
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
    <ol className="priority-list">
      {order.map((id, i) => {
        const load = island.loads.find((l) => l.id === id);
        if (!load) return null;
        const on = servedIds.includes(id);

        return (
          <li
            key={id}
            draggable
            tabIndex={0}
            role="button"
            aria-label={`${load.name}, position ${i + 1} of ${order.length}. Use arrow keys to move it.`}
            onDragStart={() => setDragId(id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragId && dragId !== id) move(order.indexOf(dragId), i);
            }}
            onDragEnd={() => setDragId(null)}
            // Arrow keys stand in for dragging, which no keyboard can do.
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                move(i, i - 1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                move(i, i + 1);
              }
            }}
            className={`priority-row${dragId === id ? " is-dragging" : ""}${on ? "" : " is-paused"}`}
            style={{ ["--accent" as string]: loadAccent(load.tier) }}
          >
            <span className="priority-rank">{i + 1}</span>
            <span className="priority-icon">
              <LoadIcon id={id} />
            </span>
            <span className="priority-name">{load.name}</span>
            <span className="priority-kw">{load.kw} kW</span>
            {!on && <span className="priority-state">paused</span>}
          </li>
        );
      })}
    </ol>
  );
}
