import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/SiteNav";

// Self-hosted by Next at build time: no external stylesheet, no render-blocking
// request, and nothing injected into <head> at runtime for a proxy to collide with.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "EcoPulse: island energy and water",
  description:
    "On an island, electricity and drinking water are the same resource. EcoPulse reads the live forecast and plans the whole island, hour by hour.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark-mode ${inter.variable} ${fraunces.variable}`}>
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
