// packages/web-app-vercel/app/client-layout.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ReactNode, useMemo } from "react";
import { Toaster } from "react-hot-toast";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity, // 個人データなので時間経過では古くならない
            gcTime: Infinity, // キャッシュを永久保持（v5ではcacheTime -> gcTimeに名称変更）
            refetchOnWindowFocus: false, // ウィンドウフォーカス時に再フェッチしない
            refetchOnMount: false, // マウント時に再フェッチしない
            refetchOnReconnect: false, // ネット再接続時に再フェッチしない
          },
        },
      }),
    []
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
