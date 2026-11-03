import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in this app is user-specific, so we use the request-time
  // rendering model rather than Cache Components / partial prefetching.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
