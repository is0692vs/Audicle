// packages/web-app-vercel/app/client-layout.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ReactNode, useMemo, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { PlaylistPlaybackProvider } from "@/contexts/PlaylistPlaybackContext";
import { useSession } from "next-auth/react";
import { useUserSettings } from "@/lib/hooks/useUserSettings";
import { applyTheme } from "@/lib/theme";
import { DEFAULT_SETTINGS, ColorTheme } from "@/types/settings";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { data: userSettings } = useUserSettings();

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

  // Initialize theme on mount
  useEffect(() => {
    if (session?.user?.email && userSettings) {
      // Logged in user: use DB settings
      applyTheme(userSettings.color_theme);
    } else {
      // Guest user: use localStorage or default
      const storedTheme = localStorage.getItem("audicle-color-theme") as string;
      const theme = storedTheme || DEFAULT_SETTINGS.color_theme;
      applyTheme(theme as ColorTheme);
    }
  }, [session, userSettings]);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <PlaylistPlaybackProvider>
          <Toaster position="top-right" />
          {children}
        </PlaylistPlaybackProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
