"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

export default function SiteNav() {
  const path = usePathname();
  const onDashboard = path.startsWith("/dashboard");

  return (
    <nav className="site-nav">
      <Link href="/" className="site-nav-brand" aria-label="EcoPulse home">
        <Logo size={30} />
        <span>EcoPulse</span>
      </Link>

      <div className="site-nav-links">
        <Link href="/" aria-current={!onDashboard ? "page" : undefined}>
          Home
        </Link>
        <Link href="/#issues">Challenges</Link>
        <Link href="/#solutions">Solutions</Link>
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
