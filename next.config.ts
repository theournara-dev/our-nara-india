import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Dev/seed placeholder images.
      { protocol: "https", hostname: "placehold.co" },
      // The live Cafe24 store and its image CDN.
      { protocol: "https", hostname: "our-nara.com" },
      { protocol: "https", hostname: "thefirstteam11.cafe24.com" },
      { protocol: "https", hostname: "img.echosting.cafe24.com" },
      { protocol: "https", hostname: "**.cafe24.com" },
      {
        protocol: "https",
        hostname: "ndoennfngice37ju.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
