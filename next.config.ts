import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const capHost = (() => {
  try {
    return process.env.CAP_SERVER_URL ? new URL(process.env.CAP_SERVER_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server be opened from a phone or the Capacitor app on the local network.
  allowedDevOrigins: [...(capHost ? [capHost] : []), "192.168.*.*", "10.*.*.*"],
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
