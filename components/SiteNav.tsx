"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";

const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "issues", label: "Challenges" },
  { id: "solutions", label: "Solutions" },
];

export default function SiteNav() {
  const path = usePathname();
  const onDashboard = path.startsWith("/dashboard");
  const [active, setActive] = useState("home");

  // Scroll spy: highlight whichever section is nearest the top of the
  // viewport, so the nav reflects where the reader actually is rather than
  // which link was last clicked.
  useEffect(() => {
    if (onDashboard) return;

    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!targets.length) return;

    const pick = () => {
      const line = window.innerHeight * 0.35;
      let current = targets[0].id;
      for (const el of targets) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
      }
      setActive(current);
    };

    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [onDashboard]);

  return (
    <nav className="site-nav">
      <span className="scroll-progress" aria-hidden="true" />
      <Link href="/" className="site-nav-brand" aria-label="EcoPulse home">
        <Logo size={30} />
        <span>EcoPulse</span>
      </Link>

      <div className="site-nav-links">
        {SECTIONS.map((s) => (
          <Link
            key={s.id}
            href={s.id === "home" ? "/" : `/#${s.id}`}
            aria-current={!onDashboard && active === s.id ? "page" : undefined}
          >
            {s.label}
          </Link>
        ))}
        <Link
          href="/dashboard"
          className="site-nav-cta"
          aria-current={onDashboard ? "page" : undefined}
        >
          Live dashboard
        </Link>
      </div>
    </nav>
  );
}
