import type { NextConfig } from "next";
// @ts-ignore
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  // Node.js APIを使用するため、serverComponentsExternalPackagesに追加
  serverExternalPackages: ['@mozilla/readability', 'jsdom', '@google-cloud/text-to-speech'],
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
