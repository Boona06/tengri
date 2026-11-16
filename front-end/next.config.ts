import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    // Keep admin cookies on the frontend origin when the API is hosted separately.
    const backend = process.env.BACKEND_API_URL?.replace(/\/$/, "");
    return backend
      ? [{ source: "/api/:path*", destination: `${backend}/api/:path*` }]
      : [];
  },
};

export default nextConfig;
