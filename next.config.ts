import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // build mínimo para Docker/EasyPanel (.next/standalone)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "supabase.nexiasoluciones.com.mx",
      },
    ],
  },
};

export default nextConfig;
