"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import ReaderView from "@/components/ReaderView";
import { PlaylistSelectorModal } from "@/components/PlaylistSelectorModal";
import { PlaylistCompletionScreen } from "@/components/PlaylistCompletionScreen";
import { usePlaylistPlayback } from "@/contexts/PlaylistPlaybackContext";
import { Chunk } from "@/types/api";
import { Playlist } from "@/types/playlist";
import { extractContent } from "@/lib/api";
import { usePlayback } from "@/hooks/usePlayback";
import { articleStorage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { recordArticleStats } from "@/lib/articleStats";
import { parseHTMLToParagraphs } from "@/lib/paragraphParser";
import { UserSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { createReaderUrl } from "@/lib/urlBuilder";
import { Play, Pause, Square, SkipBack, SkipForward } from "lucide-react";

function convertParagraphsToChunks(htmlContent: string): Chunk[] {
  // HTML構造を保持して段落を抽出
  const paragraphs = parseHTMLToParagraphs(htmlContent);

  // Chunk形式に変換
  return paragraphs.map((para) => ({
    id: para.id,
    text: para.originalText,
    cleanedText: para.cleanedText,
    type: para.type,
  }));
}

export default function ReaderPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleIdFromQuery = searchParams.get("id");
  const urlFromQuery = searchParams.get("url");
  const playlistIdFromQuery = searchParams.get("playlist");
  const indexFromQuery = searchParams.get("index");
  const autoplayFromQuery = searchParams.get("autoplay") === "true";
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  // プレイリスト再生コンテキスト
  const { state: playlistState, onArticleEnd } = usePlaylistPlayback();

  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [arePlaylistsLoaded, setArePlaylistsLoaded] = useState(false);
  const [hasLoadedFromQuery, setHasLoadedFromQuery] = useState(false);

  // プレイリスト再生のための追加状態
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState<number>(
    indexFromQuery ? parseInt(indexFromQuery, 10) : 0
  );
  const [isPlaylistMode, setIsPlaylistMode] = useState<boolean>(
    !!playlistIdFromQuery
  );
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);

  // 自動再生の参照フラグ（useEffectの無限ループを防ぐため）
  const hasInitiatedAutoplayRef = useRef(false);

  // 再生完了をバックエンドに記録する関数
  const recordPlaybackCompletion = useCallback(async () => {
    if (!url || !settings.voice_model) return;

    try {
      const response = await fetch("/api/update-playback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleUrl: url,
          voice: settings.voice_model,
          completedPlayback: true,
        }),
      });

      if (!response.ok) {
        logger.warn("再生完了の記録に失敗", {
          status: response.status,
          articleUrl: url,
          voice: settings.voice_model,
        });
      } else {
        logger.info("再生完了を記録", {
          articleUrl: url,
          voice: settings.voice_model,
        });
      }
    } catch (error) {
      logger.error("再生完了の記録エラー", error);
    }
  }, [url, settings.voice_model]);

  // 再生制御フック
  const {
    isPlaying,
    isLoading: isPlaybackLoading,
    error: playbackError,
    currentChunkId,
    play,
    pause,
    stop,
    seekToChunk,
    playbackRate,
    setPlaybackRate,
  } = usePlayback({
    chunks,
    articleUrl: url,
    voiceModel: settings.voice_model,
    playbackSpeed: settings.playback_speed,
    onArticleEnd: () => {
      // 再生完了を記録
      recordPlaybackCompletion();

      if (isPlaylistMode && playlistState.isPlaylistMode) {
        // プレイリストの最後の記事の場合は完了画面を表示
        if (currentPlaylistIndex >= playlistState.totalCount - 1) {
          setShowCompletionScreen(true);
          logger.info("プレイリスト完了", {
            playlistId: playlistState.playlistId,
            totalCount: playlistState.totalCount,
          });
        } else {
          // そうでなければ次の記事へ進む
          logger.info("次の記事へ進む", {
            currentIndex: currentPlaylistIndex,
            totalCount: playlistState.totalCount,
          });
          onArticleEnd();
        }
      }
    },
  });

  // 記事を読み込んで保存する共通ロジック
  const loadAndSaveArticle = useCallback(
    async (articleUrl: string) => {
      setIsLoading(true);
      setError("");
      try {
        const response = await extractContent(articleUrl);
        const chunksWithId = convertParagraphsToChunks(response.content);
        setChunks(chunksWithId);
        setUrl(articleUrl);
        setTitle(response.title);

        // 記事アクセス統計を記録（非同期、エラーは内部で処理される）
        recordArticleStats({
          url: articleUrl,
          title: response.title,
          content: response.content,
          chunks: chunksWithId,
        });

        // プレイリストに記事を追加
        let newArticleId: string | null = null;
        try {
          if (!selectedPlaylistId) {
            throw new Error("追加先のプレイリストが選択されていません。");
          }
          const targetPlaylistId = selectedPlaylistId;

          // プレイリストに直接追加
          const itemResponse = await fetch(
            `/api/playlists/${targetPlaylistId}/items`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                article_url: articleUrl,
                article_title: response.title,
                thumbnail_url: null,
                last_read_position: 0,
              }),
            }
          );

          if (itemResponse.ok) {
            const itemData = await itemResponse.json();
            newArticleId = itemData.article.id;
            setArticleId(newArticleId);
            setItemId(itemData.item.id);
            logger.success("記事をプレイリストに追加", {
              id: newArticleId,
              url: articleUrl,
              title: response.title,
              playlistId: targetPlaylistId,
            });
          } else {
            logger.error("記事の追加に失敗", await itemResponse.text());
          }
        } catch (itemError) {
          logger.error("記事の追加に失敗", itemError);
        }

        // ローカルストレージに保存（サーバーIDを優先）
        const newArticle = articleStorage.upsert({
          id: newArticleId || undefined, // サーバーIDがあれば使用
          url: articleUrl,
          title: response.title,
          chunks: chunksWithId,
        });

        logger.success("記事を保存", {
          id: newArticle.id,
          title: newArticle.title,
          chunkCount: chunksWithId.length,
        });

        // デフォルトプレイリストに追加した場合のみキャッシュ無効化
        const modifiedPlaylist = playlists.find(
          (p) => p.id === selectedPlaylistId
        );

        if (userEmail && modifiedPlaylist?.is_default) {
          queryClient.invalidateQueries({
            queryKey: ["defaultPlaylist"],
          });
          logger.success("ホームのキャッシュを無効化しました");
        }

        // URLに記事IDを追加（サーバーIDを優先）
        router.push(`/reader?id=${newArticleId || newArticle.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
        logger.error("記事の抽出に失敗", err);
      } finally {
        setIsLoading(false);
      }
    },
    [router, selectedPlaylistId, queryClient, userEmail, playlists]
  );

  // ユーザー設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings/get");
        if (!response.ok) {
          throw new Error(`設定の読み込みに失敗: ${response.status}`);
        }
        const data = await response.json();
        if (
          data &&
          typeof data.voice_model === "string" &&
          typeof data.playback_speed === "number"
        ) {
          setSettings(data);
        } else {
          throw new Error("Invalid settings format from API");
        }
      } catch (err) {
        logger.error("設定の読み込みに失敗", err);
        setSettings(DEFAULT_SETTINGS);
      }
    };

    loadSettings();
  }, []);

  // プレイリスト一覧を取得
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await fetch("/api/playlists");
        if (response.ok) {
          const data: Playlist[] = await response.json();
          setPlaylists(data);

          // APIレスポンスはデフォルトプレイリストが先頭に来るようにソートされているため，
          // 最初のアイテムを選択すればよい
          if (data.length > 0) {
            setSelectedPlaylistId(data[0].id);
          }
        }
      } catch (error) {
        logger.error("プレイリストの読み込みに失敗", error);
      } finally {
        // プレイリスト読み込み完了をマーク
        setArePlaylistsLoaded(true);
      }
    };

    fetchPlaylists();
  }, []);

  // 記事IDが指定されている場合は読み込み
  useEffect(() => {
    if (articleIdFromQuery) {
      const article = articleStorage.getById(articleIdFromQuery);
      if (article) {
        logger.info("記事を読み込み", {
          id: articleIdFromQuery,
          title: article.title,
        });
        // 前の再生状態をクリア
        stop();
        setTitle(article.title);
        setChunks(article.chunks);
        setUrl(article.url);
        setArticleId(articleIdFromQuery);
        // 新しい記事が読み込まれたら、自動再生フラグをリセット
        hasInitiatedAutoplayRef.current = false;
      } else {
        logger.warn("記事が見つかりません", { id: articleIdFromQuery });
        setError("記事が見つかりませんでした");
      }
    }
  }, [articleIdFromQuery, stop]);

  // インデックスパラメータが変わったときに該当記事を読み込む
  useEffect(() => {
    if (
      indexFromQuery !== null &&
      playlistIdFromQuery &&
      playlistState.items.length > 0
    ) {
      const newIndex = parseInt(indexFromQuery, 10);

      // インデックスが変わった場合のみ処理（無限ループを防ぐ）
      if (newIndex !== currentPlaylistIndex || !chunks.length) {
        setCurrentPlaylistIndex(newIndex);

        // プレイリストから該当記事を取得
        const item = playlistState.items[newIndex];
        if (item) {
          logger.info("プレイリストから記事を読み込み", {
            newIndex,
            playlistId: playlistIdFromQuery,
            articleId: item.article_id,
            articleUrl: item.article.url,
          });

          // 前の再生状態をクリア
          stop();

          // 記事をlocalStorageから読み込む
          const article = articleStorage.getById(item.article_id);
          if (article) {
            setTitle(article.title);
            setChunks(article.chunks);
            setUrl(article.url);
            setArticleId(article.id);
            // 新しい記事が読み込まれたら、自動再生フラグをリセット
            hasInitiatedAutoplayRef.current = false;
            logger.success("記事を読み込み完了", {
              id: article.id,
              title: article.title,
              chunkCount: article.chunks.length,
            });
          } else {
            logger.warn("記事がlocalStorageに見つかりません", {
              articleId: item.article_id,
            });
            setError("記事が見つかりませんでした");
            // 以前の記事情報をクリア
            setTitle("");
            setChunks([]);
            setUrl("");
            setArticleId(null);
          }
        } else {
          logger.error("プレイリストにインデックスが存在しません", {
            newIndex,
            itemsLength: playlistState.items.length,
          });
          setError("無効な記事インデックスです。");
          // 以前の記事情報をクリア
          setTitle("");
          setChunks([]);
          setUrl("");
          setArticleId(null);
        }
      }
    }
  }, [
    indexFromQuery,
    playlistIdFromQuery,
    playlistState.items,
    currentPlaylistIndex,
    chunks.length,
    stop,
  ]); // URLクエリパラメータが指定されている場合は記事を自動取得
  useEffect(() => {
    // プレイリスト読み込みが完了してから記事を読み込む
    if (urlFromQuery && arePlaylistsLoaded && !hasLoadedFromQuery) {
      setUrl(urlFromQuery || "");
      // 既にlocalStorageに同じURLの記事が存在するかチェック
      const existingArticle = articleStorage
        .getAll()
        .find((a) => a.url === urlFromQuery);
      if (existingArticle) {
        // 既存の記事がある場合は、そのIDを使ってリダイレクト
        logger.info("既存の記事を読み込み", {
          id: existingArticle.id,
          title: existingArticle.title,
        });
        // 既存の記事情報をステートに設定
        setTitle(existingArticle.title);
        setChunks(existingArticle.chunks);
        setArticleId(existingArticle.id);
        // URLSearchParamsを使用して安全にURLを生成
        const readerUrl = createReaderUrl({
          articleId: existingArticle.id,
          playlistId: playlistIdFromQuery || undefined,
          playlistIndex: indexFromQuery
            ? parseInt(indexFromQuery, 10)
            : undefined,
          autoplay: autoplayFromQuery,
        });
        // 新しいURLにリダイレクトするため、参照フラグをリセット
        hasInitiatedAutoplayRef.current = false;
        router.push(readerUrl);
      } else {
        // 新しい記事の場合は取得
        loadAndSaveArticle(urlFromQuery);
      }
      setHasLoadedFromQuery(true);
    }
  }, [
    urlFromQuery,
    arePlaylistsLoaded,
    router,
    loadAndSaveArticle,
    hasLoadedFromQuery,
    autoplayFromQuery,
    playlistIdFromQuery,
    indexFromQuery,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loadAndSaveArticle(url);
  };

  // autoplay パラメータが指定されている場合、チャンクが読み込まれたら自動再生
  useEffect(() => {
    if (
      autoplayFromQuery &&
      chunks.length > 0 &&
      !isLoading &&
      !isPlaying &&
      !isPlaybackLoading &&
      !hasInitiatedAutoplayRef.current
    ) {
      // 自動再生フラグを立てて、再生を開始
      // useRefを使用することで、複数回呼び出されるのを防ぐ
      logger.info("自動再生を開始", {
        chunksCount: chunks.length,
        isLoading,
        isPlaying,
        isPlaybackLoading,
      });
      hasInitiatedAutoplayRef.current = true;
      play();
    }
  }, [
    autoplayFromQuery,
    chunks.length,
    isLoading,
    isPlaying,
    isPlaybackLoading,
    play,
  ]);

  // プレイリスト内の特定の記事に遷移するヘルパー関数
  const navigateToPlaylistItem = useCallback(
    (index: number) => {
      const item = playlistState.items[index];
      if (item && playlistState.playlistId) {
        const readerUrl = createReaderUrl({
          articleUrl: item.article.url,
          playlistId: playlistState.playlistId,
          playlistIndex: index,
          autoplay: true,
        });
        router.push(readerUrl);
      }
    },
    [playlistState, router]
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー: URL入力欄 */}
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              ← 記事一覧
            </button>
            <h1 className="text-2xl font-bold">Audicle</h1>
          </div>
          {title && (
            <h2 className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {title}
            </h2>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="記事のURLを入力してください"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              required
            />

            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                追加先:
              </label>
              <select
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading || playlists.length === 0}
              >
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.is_default ? "📌 " : ""}
                    {playlist.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "読込中..." : "読込"}
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-2 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          {playbackError && (
            <div className="mt-2 text-red-600 dark:text-red-400 text-sm">
              {playbackError}
            </div>
          )}
          {/* プレイリスト再生情報 */}
          {isPlaylistMode && playlistState.isPlaylistMode && (
            <div className="mt-4 bg-violet-950/30 p-4 rounded-lg border border-violet-900/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-zinc-400">
                    プレイリストから再生中
                  </p>
                  <p className="text-lg font-semibold text-violet-300">
                    {playlistState.playlistName}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {currentPlaylistIndex + 1} / {playlistState.totalCount}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (currentPlaylistIndex > 0) {
                        navigateToPlaylistItem(currentPlaylistIndex - 1);
                      }
                    }}
                    disabled={currentPlaylistIndex === 0}
                    className="px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                  >
                    <SkipBack className="size-4" />
                    <span className="hidden sm:inline">前へ</span>
                  </button>
                  <button
                    onClick={() => {
                      if (currentPlaylistIndex < playlistState.totalCount - 1) {
                        navigateToPlaylistItem(currentPlaylistIndex + 1);
                      }
                    }}
                    disabled={
                      currentPlaylistIndex === playlistState.totalCount - 1
                    }
                    className="px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                  >
                    <span className="hidden sm:inline">次へ</span>
                    <SkipForward className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (playlistState.playlistId) {
                        router.push(`/playlists/${playlistState.playlistId}`);
                      }
                    }}
                    className="px-3 py-1 bg-zinc-700 text-white rounded hover:bg-zinc-600 transition-colors text-sm"
                  >
                    プレイリストに戻る
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 再生コントロール */}
          {chunks.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={isPlaying ? pause : play}
                  disabled={isPlaybackLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 min-w-11"
                  title={
                    isPlaybackLoading
                      ? "処理中..."
                      : isPlaying
                      ? "一時停止"
                      : "再生"
                  }
                >
                  {isPlaying ? (
                    <Pause className="size-5" />
                  ) : (
                    <Play className="size-5" />
                  )}
                  <span className="hidden sm:inline">
                    {isPlaybackLoading
                      ? "処理中..."
                      : isPlaying
                      ? "一時停止"
                      : "再生"}
                  </span>
                </button>
                <button
                  onClick={stop}
                  disabled={!isPlaying && !isPlaybackLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 min-w-11"
                  title="停止"
                >
                  <Square className="size-5" />
                  <span className="hidden sm:inline">停止</span>
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <label
                    htmlFor="playback-rate"
                    className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
                  >
                    速度:
                  </label>
                  <input
                    id="playback-rate"
                    type="range"
                    min="0.8"
                    max="3.0"
                    step="0.1"
                    value={playbackRate}
                    onChange={(e) =>
                      setPlaybackRate(parseFloat(e.target.value))
                    }
                    className="w-24 sm:w-32"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                    {playbackRate.toFixed(1)}x
                  </span>
                </div>
              </div>
              {/* プレイリスト追加ボタン */}
              {articleId && (
                <button
                  onClick={() => setIsPlaylistModalOpen(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  title="プレイリストに追加"
                >
                  📋 プレイリストに追加
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ: リーダービューまたは完了画面 */}
      <main className="flex-1 overflow-hidden">
        {showCompletionScreen && isPlaylistMode ? (
          <PlaylistCompletionScreen
            playlistId={playlistState.playlistId || ""}
            playlistName={playlistState.playlistName || "プレイリスト"}
            totalCount={playlistState.totalCount}
            onReplay={() => {
              setShowCompletionScreen(false);
              navigateToPlaylistItem(0);
            }}
          />
        ) : (
          <ReaderView
            chunks={chunks}
            currentChunkId={currentChunkId}
            articleUrl={
              url ||
              (articleId
                ? articleStorage.getById(articleId)?.url
                : undefined) ||
              ""
            }
            voiceModel={settings.voice_model}
            speed={playbackRate}
            onChunkClick={seekToChunk}
          />
        )}
      </main>

      {/* プレイリストセレクターモーダル */}
      {articleId && (
        <PlaylistSelectorModal
          isOpen={isPlaylistModalOpen}
          onClose={() => setIsPlaylistModalOpen(false)}
          itemId={itemId || undefined}
          articleId={articleId}
          articleTitle={title}
          onPlaylistsUpdated={async () => {}}
        />
      )}
    </div>
  );
}
