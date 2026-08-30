"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Reveals the landing page's cards as they enter the viewport.
 *
 * Renders nothing and takes no useGSAP scope, because the elements it
 * animates belong to the page rather than to this component. useGSAP runs in
 * a layout effect, so the hidden state is set before the browser paints and
 * there is no flash of visible-then-hidden content.
 */
const GROUPS: [container: string, child: string][] = [
  [".lp .stats", ".stat-card"],
  [".lp #dashboard", ".data-card"],
  [".lp #issues", ".issue-card"],
  [".lp #solutions", ".solution-card"],
];

export default function LandingMotion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      for (const [container, child] of GROUPS) {
        const cards = gsap.utils.toArray<HTMLElement>(`${container} ${child}`);
        if (!cards.length) continue;

        // fromTo, not from: a from() tween paired with ScrollTrigger defers
        // its initial render, so the cards would sit visible and then jump.
        gsap.fromTo(
          cards,
          { y: 26, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: { trigger: container, start: "top 85%", once: true },
          },
        );
      }

      // Hero background drifts slower than the page, giving the fold depth.
      const hero = document.querySelector<HTMLElement>(".lp .hero");
      if (hero) {
        gsap.to(hero, {
          backgroundPositionY: "28%",
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 },
        });
      }

      // Reading-progress bar across the top of the nav.
      const bar = document.querySelector<HTMLElement>(".scroll-progress");
      if (bar) {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            transformOrigin: "left center",
            scrollTrigger: { start: 0, end: () => document.body.scrollHeight - window.innerHeight, scrub: 0.25 },
          },
        );
      }

      for (const el of gsap.utils.toArray<HTMLElement>(
        ".lp .section-label, .lp section > h2",
      )) {
        gsap.fromTo(
          el,
          { y: 14, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          },
        );
      }
    });
  });

  return null;
}
