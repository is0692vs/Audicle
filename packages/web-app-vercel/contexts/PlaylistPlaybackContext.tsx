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
import { STORAGE_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import type { PlaylistItemWithArticle } from "@/types/playlist";

export interface PlaylistPlaybackState {
  playlistId: string | null;
  playlistName: string | null;
  currentIndex: number;
  items: PlaylistItemWithArticle[];
  totalCount: number;
  isPlaylistMode: boolean;
  sortField: string | null;
  sortOrder: "asc" | "desc" | null;
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
  initializeFromArticle: (articleUrl: string) => Promise<void>;
  initializeFromPlaylist: (
    playlistId: string,
    startIndex?: number
  ) => Promise<void>;
  canMovePrevious: boolean;
  canMoveNext: boolean;
}

const PlaylistPlaybackContext = createContext<
  PlaylistPlaybackContextType | undefined
>(undefined);

const STORAGE_KEY = STORAGE_KEYS.PLAYLIST_PLAYBACK;

/**
 * SortOptionをfieldとorderにパース
 */
function parseSortOption(sortOption: string | null): {
  field: string | null;
  order: "asc" | "desc" | null;
} {
  if (!sortOption) {
    return { field: "position", order: "asc" };
  }

  const [field, orderSuffix] = sortOption.split('-');
  let order: "asc" | "desc" = orderSuffix === 'desc' ? 'desc' : 'asc';

  // added_at のデフォルトは desc (古い順)
  if (field === 'added_at' && !orderSuffix) {
    order = 'desc';
  }

  const validFields = ["position", "title", "added_at"];
  if (validFields.includes(field)) {
    return { field, order };
  }

  logger.warn(
    `Unsupported sort option found in localStorage: ${sortOption}`
  );
  return { field: "position", order: "asc" };
}

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
          sortField: state.sortField,
          sortOrder: state.sortOrder,
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
      sortField: saved?.sortField || null,
      sortOrder: saved?.sortOrder || null,
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
        sortField: null,
        sortOrder: null,
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
      if (!prevState.isPlaylistMode || prevState.items.length === 0) {
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
      // wrap-around to support circular navigation
      const nextIndex = (prevState.currentIndex + 1) % prevState.items.length;
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
      if (!prevState.isPlaylistMode || prevState.items.length === 0) {
        logger.warn(
          "playPrevious: プレイリストの最初またはプレイリストモードではない",
          {
            isPlaylistMode: prevState.isPlaylistMode,
            currentIndex: prevState.currentIndex,
          }
        );
        return prevState;
      }
      // wrap-around to support circular navigation
      const prevIndex =
        (prevState.currentIndex - 1 + prevState.items.length) %
        prevState.items.length;
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
      sortField: null,
      sortOrder: null,
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

      if (prevState.items.length > 0) {
        // Circular next on end
        const nextIndex = (prevState.currentIndex + 1) % prevState.items.length;
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

        return { ...prevState, currentIndex: nextIndex };
      }

      // プレイリストの最後に到達
      logger.info("プレイリストの最後に到達", {
        totalCount: prevState.items.length,
      });
      return prevState;
    });
  }, [router]);

  /**
   * 記事URLからプレイリストを自動検出して初期化
   */
  const initializeFromArticle = useCallback(async (articleUrl: string) => {
    try {
      logger.info("記事からプレイリストを検出", { articleUrl });

      // 記事が属するプレイリスト一覧を取得
      const response = await fetch(
        `/api/articles-by-url/${encodeURIComponent(articleUrl)}/playlists`
      );

      if (!response.ok) {
        logger.warn("プレイリストの取得に失敗", { status: response.status });
        return;
      }

      const playlists = await response.json();

      if (!Array.isArray(playlists) || playlists.length === 0) {
        logger.info("記事が属するプレイリストなし");
        return;
      }

      // デフォルトプレイリストを優先、なければ最初のプレイリスト
      const targetPlaylist =
        playlists.find((p) => p.is_default) || playlists[0];

      logger.info("プレイリストを選択", {
        playlistId: targetPlaylist.id,
        playlistName: targetPlaylist.name,
        isDefault: targetPlaylist.is_default,
      });

      // localStorageからsortオプションを読み込み
      const sortKey = `${STORAGE_KEYS.PLAYLIST_SORT_PREFIX}${targetPlaylist.id}`;
      const savedSortOption =
        typeof window !== "undefined" ? localStorage.getItem(sortKey) : null;
      const { field: sortField, order: sortOrder } =
        parseSortOption(savedSortOption);

      // APIにソートパラメータを渡す
      const queryParams = new URLSearchParams();
      if (sortField && sortOrder) {
        queryParams.set("sortField", sortField);
        queryParams.set("sortOrder", sortOrder);
      }
      const apiUrl = `/api/playlists/${targetPlaylist.id}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

      // プレイリスト内のアイテムを取得
      const itemsResponse = await fetch(apiUrl);

      if (!itemsResponse.ok) {
        logger.warn("プレイリストアイテムの取得に失敗", {
          status: itemsResponse.status,
        });
        return;
      }

      const playlistData = await itemsResponse.json();
      const items: PlaylistItemWithArticle[] = playlistData.items || [];

      // 現在の記事のインデックスを特定
      const currentIndex = items.findIndex(
        (item) => item.article.url === articleUrl
      );

      if (currentIndex === -1) {
        logger.warn("プレイリスト内に記事が見つからない", { articleUrl });
        return;
      }

      logger.success("プレイリストコンテキストを初期化", {
        playlistId: targetPlaylist.id,
        currentIndex,
        totalCount: items.length,
      });

      // プレイリストコンテキストを初期化（ページ遷移なし）
      setState({
        playlistId: targetPlaylist.id,
        playlistName: targetPlaylist.name,
        currentIndex,
        items,
        totalCount: items.length,
        isPlaylistMode: true,
        sortField,
        sortOrder,
      });
    } catch (error) {
      logger.error("プレイリスト初期化エラー", error);
    }
  }, []);

  const initializeFromPlaylist = useCallback(
    async (playlistId: string, startIndex: number = 0) => {
      try {
        logger.info("プレイリストをIDから初期化", { playlistId });

        // localStorageからsortオプションを読み込み
        const sortKey = `${STORAGE_KEYS.PLAYLIST_SORT_PREFIX}${playlistId}`;
        const savedSortOption =
          typeof window !== "undefined" ? localStorage.getItem(sortKey) : null;
        const { field: sortField, order: sortOrder } =
          parseSortOption(savedSortOption);

        // APIにソートパラメータを渡す
        const queryParams = new URLSearchParams();
        if (sortField && sortOrder) {
          queryParams.set("sortField", sortField);
          queryParams.set("sortOrder", sortOrder);
        }
        const apiUrl = `/api/playlists/${playlistId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

        const res = await fetch(apiUrl);
        if (!res.ok) {
          logger.warn("プレイリスト取得失敗", {
            playlistId,
            status: res.status,
          });
          return;
        }

        const playlistData = await res.json();
        const items: PlaylistItemWithArticle[] = playlistData.items || [];

        if (!Array.isArray(items) || items.length === 0) {
          logger.info("プレイリストにアイテムがないため初期化しない", {
            playlistId,
          });
          return;
        }

        const index = Math.max(0, Math.min(startIndex, items.length - 1));
        setState({
          playlistId: playlistData.id,
          playlistName: playlistData.name,
          currentIndex: index,
          items,
          totalCount: items.length,
          isPlaylistMode: true,
          sortField,
          sortOrder,
        });
      } catch (error) {
        logger.error("initializeFromPlaylist error", error);
      }
    },
    []
  );

  // With circular navigation enabled, Prev/Next are available as long as items exist
  const canMovePrevious = state.items.length > 0;
  const canMoveNext = state.items.length > 0;

  const value: PlaylistPlaybackContextType = {
    state,
    startPlaylistPlayback,
    playNext,
    playPrevious,
    stopPlaylistPlayback,
    onArticleEnd,
    initializeFromArticle,
    initializeFromPlaylist,
    canMovePrevious,
    canMoveNext,
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
