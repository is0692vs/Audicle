import type { NextConfig } from "next";
// @ts-expect-error next-pwa does not provide TypeScript definitions
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
  disable: true,
  // PWAがAPI Routesをキャッシュしないように設定
  runtimeCaching: [
    {
      urlPattern: /^https?.*(?!\/api\/).*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'staticCache',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'apiCache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60,
        },
        networkTimeoutSeconds: 5,
      },
    },
  ],
})(nextConfig);
