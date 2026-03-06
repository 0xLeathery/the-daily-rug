import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @coral-xyz/anchor uses Node.js Buffer extensively and must not be bundled
  // into edge contexts. Route handlers run in Node.js runtime so this is safe.
  serverExternalPackages: ['@coral-xyz/anchor'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
