import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoPulse — island microgrid control",
  description:
    "On an island, electricity and drinking water are the same resource. EcoPulse plans the day.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark-mode">
      <body>{children}</body>
    </html>
  );
}
