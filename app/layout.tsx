import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoPulse — island energy and water",
  description:
    "On an island, electricity and drinking water are the same resource. EcoPulse reads the live forecast and plans the whole island, hour by hour.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark-mode">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
