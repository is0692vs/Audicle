"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import type { PlaylistItemWithArticle } from "@/types/playlist";

export interface PlaylistPlaybackState {
  playlistId: string | null;
  playlistName: string | null;
  currentIndex: number;
  items: PlaylistItemWithArticle[];
  totalCount: number;
  isPlaylistMode: boolean;
}

export interface PlaylistPlaybackContextType {
  state: PlaylistPlaybackState;
  startPlaylistPlayback: (
    playlistId: string,
    playlistName: string,
    items: PlaylistItemWithArticle[],
    startIndex?: number
  ) => void;
  playNext: () => void;
  playPrevious: () => void;
  stopPlaylistPlayback: () => void;
  onArticleEnd: () => void;
}

const PlaylistPlaybackContext = createContext<
  PlaylistPlaybackContextType | undefined
>(undefined);

const STORAGE_KEY = "audicle-playlist-playback";

/**
 * プレイリスト再生状態をlocalStorageに保存
 */
function savePlaybackState(state: PlaylistPlaybackState): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          playlistId: state.playlistId,
          playlistName: state.playlistName,
          currentIndex: state.currentIndex,
          items: state.items,
          totalCount: state.totalCount,
          isPlaylistMode: state.isPlaylistMode,
        })
      );
    } catch (error) {
      console.error("Failed to save playlist playback state:", error);
    }
  }
}

/**
 * localStorageからプレイリスト再生状態を読み込む
 */
function loadPlaybackState(): Partial<PlaylistPlaybackState> | null {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error("Failed to load playlist playback state:", error);
      return null;
    }
  }
  return null;
}

export function PlaylistPlaybackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<PlaylistPlaybackState>(() => {
    const saved = loadPlaybackState();
    return {
      playlistId: saved?.playlistId || null,
      playlistName: saved?.playlistName || null,
      currentIndex: saved?.currentIndex || 0,
      items: [],
      totalCount: saved?.totalCount || 0,
      isPlaylistMode: saved?.isPlaylistMode || false,
    };
  });

  // 状態が変わったらlocalStorageに保存
  useEffect(() => {
    savePlaybackState(state);
  }, [state]);

  const startPlaylistPlayback = useCallback(
    (
      playlistId: string,
      playlistName: string,
      items: PlaylistItemWithArticle[],
      startIndex: number = 0
    ) => {
      setState({
        playlistId,
        playlistName,
        currentIndex: startIndex,
        items,
        totalCount: items.length,
        isPlaylistMode: true,
      });

      // 最初の記事に遷移（自動再生フラグ付き）
      if (items.length > startIndex) {
        const firstItem = items[startIndex];
        const readerUrl = `/reader?url=${encodeURIComponent(
          firstItem.article.url
        )}&playlist=${playlistId}&index=${startIndex}&autoplay=true`;
        router.push(readerUrl);
      }
    },
    [router]
  );

  const playNext = useCallback(() => {
    setState((prevState) => {
      if (
        !prevState.isPlaylistMode ||
        prevState.currentIndex >= prevState.items.length - 1
      ) {
        return prevState;
      }

      const nextIndex = prevState.currentIndex + 1;
      const nextItem = prevState.items[nextIndex];

      if (nextItem) {
        const nextUrl = `/reader?url=${encodeURIComponent(
          nextItem.article.url
        )}&playlist=${prevState.playlistId}&index=${nextIndex}&autoplay=true`;
        router.push(nextUrl);
      }

      return {
        ...prevState,
        currentIndex: nextIndex,
      };
    });
  }, [router]);

  const playPrevious = useCallback(() => {
    setState((prevState) => {
      if (!prevState.isPlaylistMode || prevState.currentIndex === 0) {
        return prevState;
      }

      const prevIndex = prevState.currentIndex - 1;
      const prevItem = prevState.items[prevIndex];

      if (prevItem) {
        const prevUrl = `/reader?url=${encodeURIComponent(
          prevItem.article.url
        )}&playlist=${prevState.playlistId}&index=${prevIndex}&autoplay=true`;
        router.push(prevUrl);
      }

      return {
        ...prevState,
        currentIndex: prevIndex,
      };
    });
  }, [router]);

  const stopPlaylistPlayback = useCallback(() => {
    setState({
      playlistId: null,
      playlistName: null,
      currentIndex: 0,
      items: [],
      totalCount: 0,
      isPlaylistMode: false,
    });
  }, []);

  const onArticleEnd = useCallback(() => {
    setState((prevState) => {
      if (!prevState.isPlaylistMode) {
        return prevState;
      }

      if (prevState.currentIndex < prevState.items.length - 1) {
        // 次の記事に自動遷移（自動再生フラグ付き）
        const nextIndex = prevState.currentIndex + 1;
        const nextItem = prevState.items[nextIndex];

        if (nextItem) {
          const nextUrl = `/reader?url=${encodeURIComponent(
            nextItem.article.url
          )}&playlist=${prevState.playlistId}&index=${nextIndex}&autoplay=true`;
          router.push(nextUrl);
        }

        return {
          ...prevState,
          currentIndex: nextIndex,
        };
      }

      // プレイリストの最後に到達
      return prevState;
    });
  }, [router]);

  const value: PlaylistPlaybackContextType = {
    state,
    startPlaylistPlayback,
    playNext,
    playPrevious,
    stopPlaylistPlayback,
    onArticleEnd,
  };

  return (
    <PlaylistPlaybackContext.Provider value={value}>
      {children}
    </PlaylistPlaybackContext.Provider>
  );
}

export function usePlaylistPlayback(): PlaylistPlaybackContextType {
  const context = useContext(PlaylistPlaybackContext);
  if (!context) {
    throw new Error(
      "usePlaylistPlayback must be used within PlaylistPlaybackProvider"
    );
  }
  return context;
}
