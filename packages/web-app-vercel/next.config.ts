import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

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

  // ビルド時のESLintをスキップ（開発時は実行される）
  eslint: {
    ignoreDuringBuilds: true,
  },
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

export default withSerwist(nextConfig);
