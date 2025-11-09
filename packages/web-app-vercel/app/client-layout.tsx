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
            staleTime: 5 * 60 * 1000, // 5分間は新鮮（クロスタブ同期のため）
            gcTime: 5 * 60 * 1000, // 5分間（デフォルト）でガベージコレクション
            refetchOnWindowFocus: true, // ウィンドウフォーカス時に再フェッチ
            refetchOnMount: true, // マウント時に再フェッチ
            refetchOnReconnect: true, // ネット再接続時に再フェッチ
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
