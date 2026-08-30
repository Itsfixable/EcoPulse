"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

/** Tweens a number into a span so metrics re-count instead of snapping. */
export function useCountUp(value: number, decimals = 0) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    prev.current = value;

    if (from === value) {
      el.textContent = value.toFixed(decimals);
      return;
    }

    const box = { v: from };
    gsap.to(box, {
      v: value,
      duration: 0.65,
      ease: "power2.out",
      onUpdate() {
        el.textContent = box.v.toFixed(decimals);
      },
    });
  }, [value, decimals]);

  return ref;
}
