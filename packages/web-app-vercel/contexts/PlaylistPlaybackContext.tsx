"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { createReaderUrl } from "@/lib/urlBuilder";
import { logger } from "@/lib/logger";
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
      items: saved?.items || [],
      totalCount: saved?.totalCount || 0,
      isPlaylistMode: saved?.isPlaylistMode || false,
    };
  });

  // 状態が変わったらlocalStorageに保存
  useEffect(() => {
    savePlaybackState(state);
    logger.info("プレイリスト状態を保存", {
      playlistId: state.playlistId,
      currentIndex: state.currentIndex,
      totalCount: state.totalCount,
      itemsCount: state.items.length,
    });
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
        const readerUrl = createReaderUrl({
          articleUrl: firstItem.article.url,
          playlistId,
          playlistIndex: startIndex,
          autoplay: true,
        });
        router.push(readerUrl);
      }
    },
    [router]
  );

  const playNext = useCallback(() => {
    setState((prevState) => {
      if (
        !prevState.isPlaylistMode ||
        prevState.items.length === 0 ||
        prevState.currentIndex >= prevState.items.length - 1
      ) {
        logger.warn(
          "playNext: プレイリストの最後またはプレイリストモードではない",
          {
            isPlaylistMode: prevState.isPlaylistMode,
            currentIndex: prevState.currentIndex,
            itemsCount: prevState.items.length,
          }
        );
        return prevState;
      }

      const nextIndex = prevState.currentIndex + 1;
      const nextItem = prevState.items[nextIndex];

      logger.info("次の記事へ移動", {
        currentIndex: prevState.currentIndex,
        nextIndex,
        totalCount: prevState.items.length,
        articleUrl: nextItem?.article.url,
      });

      if (nextItem && prevState.playlistId) {
        const nextUrl = createReaderUrl({
          articleUrl: nextItem.article.url,
          playlistId: prevState.playlistId,
          playlistIndex: nextIndex,
          autoplay: true,
        });
        router.push(nextUrl);

        return {
          ...prevState,
          currentIndex: nextIndex,
        };
      }

      return prevState;
    });
  }, [router]);

  const playPrevious = useCallback(() => {
    setState((prevState) => {
      if (!prevState.isPlaylistMode || prevState.currentIndex === 0) {
        logger.warn(
          "playPrevious: プレイリストの最初またはプレイリストモードではない",
          {
            isPlaylistMode: prevState.isPlaylistMode,
            currentIndex: prevState.currentIndex,
          }
        );
        return prevState;
      }

      const prevIndex = prevState.currentIndex - 1;
      const prevItem = prevState.items[prevIndex];

      logger.info("前の記事へ移動", {
        currentIndex: prevState.currentIndex,
        prevIndex,
        totalCount: prevState.items.length,
        articleUrl: prevItem?.article.url,
      });

      if (prevItem && prevState.playlistId) {
        const prevUrl = createReaderUrl({
          articleUrl: prevItem.article.url,
          playlistId: prevState.playlistId,
          playlistIndex: prevIndex,
          autoplay: true,
        });
        router.push(prevUrl);

        return {
          ...prevState,
          currentIndex: prevIndex,
        };
      }

      return prevState;
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
        logger.info("onArticleEnd: プレイリストモードではない");
        return prevState;
      }

      logger.info("記事終了", {
        currentIndex: prevState.currentIndex,
        totalCount: prevState.items.length,
        itemsCount: prevState.items.length,
      });

      if (prevState.currentIndex < prevState.items.length - 1) {
        // 次の記事に自動遷移（自動再生フラグ付き）
        const nextIndex = prevState.currentIndex + 1;
        const nextItem = prevState.items[nextIndex];

        logger.info("自動的に次の記事へ遷移", {
          nextIndex,
          totalCount: prevState.items.length,
          articleUrl: nextItem?.article.url,
        });

        if (nextItem && prevState.playlistId) {
          const nextUrl = createReaderUrl({
            articleUrl: nextItem.article.url,
            playlistId: prevState.playlistId,
            playlistIndex: nextIndex,
            autoplay: true,
          });
          router.push(nextUrl);
        }

        return {
          ...prevState,
          currentIndex: nextIndex,
        };
      }

      // プレイリストの最後に到達
      logger.info("プレイリストの最後に到達", {
        totalCount: prevState.items.length,
      });
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
