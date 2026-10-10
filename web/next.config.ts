import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Photos d'annonces servies par le stockage public Supabase
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/photos-annonces/**",
      },
    ],
  },
};

export default nextConfig;
