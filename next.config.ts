import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks cross-origin requests to dev assets by default. Replit
  // serves the workspace through a proxy domain, so the dev server has to
  // accept those origins or HMR and dev endpoints fail behind the preview.
  allowedDevOrigins: [
    "*.replit.dev",
    "*.repl.co",
    "*.replit.app",
    "*.worf.replit.dev",
    "*.picard.replit.dev",
    "*.riker.replit.dev",
    "*.janeway.replit.dev",
    "*.kirk.replit.dev",
  ],
};

export default nextConfig;
