"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Logo from "./Logo";

const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "issues", label: "Challenges" },
  { id: "solutions", label: "Solutions" },
];

/** Height of the sticky bar, so anchors land below it rather than under it. */
const NAV_OFFSET = 88;

export default function SiteNav() {
  const path = usePathname();
  const onDashboard = path.startsWith("/dashboard");
  const [active, setActive] = useState("home");

  const pick = useCallback(() => {
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!targets.length) return;

    // At the bottom of the page the last section may never reach the marker
    // line, so nothing would ever highlight it. Claim it explicitly.
    const atBottom =
      window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
    if (atBottom) {
      setActive(targets[targets.length - 1].id);
      return;
    }

    const line = window.innerHeight * 0.35;
    let current = targets[0].id;
    for (const el of targets) {
      if (el.getBoundingClientRect().top <= line) current = el.id;
    }
    setActive(current);
  }, []);

  useEffect(() => {
    if (onDashboard) return;
    // Deferred rather than called inline: setting state synchronously in an
    // effect body cascades a render.
    const raf = requestAnimationFrame(pick);
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [onDashboard, pick]);

  /**
   * Drive the jump ourselves rather than relying on the hash. A hash that is
   * already set produces no navigation, so clicking the section you are on,
   * or any section already in view, did nothing at all.
   */
  const goTo = (e: React.MouseEvent, id: string) => {
    if (onDashboard) return; // let the link navigate to the landing page
    const el = id === "home" ? null : document.getElementById(id);
    if (id !== "home" && !el) return;

    e.preventDefault();
    setActive(id);

    const top = el ? window.scrollY + el.getBoundingClientRect().top - NAV_OFFSET : 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });

    history.replaceState(null, "", id === "home" ? "/" : `#${id}`);
  };

  return (
    <nav className="site-nav">
      <Link href="/" className="site-nav-brand" aria-label="EcoPulse home">
        <Logo size={30} />
        <span>EcoPulse</span>
      </Link>

      <div className="site-nav-links">
        {SECTIONS.map((s) => (
          <Link
            key={s.id}
            href={s.id === "home" ? "/" : `/#${s.id}`}
            onClick={(e) => goTo(e, s.id)}
            aria-current={!onDashboard && active === s.id ? "page" : undefined}
          >
            {s.label}
          </Link>
        ))}
        <Link href="/dashboard" aria-current={onDashboard ? "page" : undefined}>
          Live dashboard
        </Link>
      </div>
    </nav>
  );
}
