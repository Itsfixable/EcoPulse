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
    <ol className="priority-list">
      {order.map((id, i) => {
        const load = island.loads.find((l) => l.id === id);
        if (!load) return null;
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
            className={`priority-row${dragId === id ? " is-dragging" : ""}${on ? "" : " is-paused"}`}
          >
            <span className="priority-rank">{i + 1}</span>
            <span className="priority-name">{load.name}</span>
            <span className="priority-kw">{load.kw} kW</span>
            <span className="priority-tier">T{load.tier}</span>
            {!on && <span className="priority-state">paused</span>}

            {/* Buttons as well as dragging: reliable on touch, and reachable
                from the keyboard, which drag-and-drop is not. */}
            <span className="priority-moves">
              <button
                type="button"
                aria-label={`Move ${load.name} up`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${load.name} down`}
                disabled={i === order.length - 1}
                onClick={() => move(i, i + 1)}
              >
                ↓
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
