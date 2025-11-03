import type { NextConfig } from "next";
// @ts-ignore
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Node.js APIを使用するため、serverExternalPackagesに追加
  serverExternalPackages: ['@mozilla/readability', 'linkedom', '@google-cloud/text-to-speech'],
  
  // API Routesの明示的な設定
  experimental: {
    // turbopackでのAPI Routes処理を改善
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // PWAがAPI Routesをキャッシュしないように設定
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
        // API Routesを除外
        networkTimeoutSeconds: 10,
      },
    },
  ],
})(nextConfig);
