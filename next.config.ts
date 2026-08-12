import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["@prisma/client"],
  // Allow the preview-proxy origin (space-z.ai) and the internal gateway
  // origin to forward Server Actions requests. Without this, every Server
  // Action triggered from the preview panel fails with a 500 because the
  // `x-forwarded-host` header doesn't match the `origin` header.
  allowedDevOrigins: [
    "preview-chat-4f49deab-6eed-4178-8917-8a8a11ca31c8.space-z.ai",
    "*.space-z.ai",
    "ws-dcba-b-eaebf-keqoogfkfa.cn-hongkong-vpc.fcapp.run",
    "*.cn-hongkong-vpc.fcapp.run",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
