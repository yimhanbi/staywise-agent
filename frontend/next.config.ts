import type { NextConfig } from "next";

const backendBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, "") ??
  "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
