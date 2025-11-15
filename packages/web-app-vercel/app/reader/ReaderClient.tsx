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
import { articleStorage } from "@/lib/articleStorage";
import { logger } from "@/lib/logger";
import { useDownload } from "@/hooks/useDownload";
import { MobileArticleMenu } from "@/components/MobileArticleMenu";
import { recordArticleStats } from "@/lib/articleStats";
import { parseHTMLToParagraphs } from "@/lib/paragraphParser";
import { UserSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { createReaderUrl } from "@/lib/urlBuilder";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

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

  const chunkCount = chunks.length;

  useEffect(() => {
    if (!url) return;
    logger.info("ReaderClient articleUrl ready", {
      articleUrl: url,
      chunkCount,
    });
  }, [url, chunkCount]);

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

  // ダウンロード機能（モバイルメニュー用）はReaderViewに集約されています
  const { status: downloadStatus, startDownload } = useDownload({
    articleUrl: url,
    chunks,
    voiceModel: settings.voice_model,
    speed: playbackRate,
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
      stop(); // ページ遷移前に再生を停止
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
    [playlistState, router, stop]
  );

  // 再生速度変更ハンドラー（デスクトップ版とモバイル版で共通）
  const handlePlaybackRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPlaybackRate(parseFloat(e.target.value));
    },
    [setPlaybackRate]
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー: コンパクト化されたナビゲーションとコントロール */}
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-2 sm:p-4">
          {/* トップバー: ナビゲーションとタイトル */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <button
              onClick={() => {
                stop(); // ページ遷移前に再生を停止
                if (isPlaylistMode && playlistState.playlistId) {
                  router.push(`/playlists/${playlistState.playlistId}`);
                } else {
                  router.push("/");
                }
              }}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors shrink-0"
            >
              ← {isPlaylistMode ? "プレイリストに戻る" : "記事一覧"}
            </button>
            <h1 className="text-lg sm:text-2xl font-bold">Audicle</h1>
            {/* モバイルメニュー: 640px未満で表示 */}
            {url && (
              <div className="sm:hidden">
                <MobileArticleMenu
                  articleUrl={url}
                  onDownload={startDownload}
                  isDownloading={downloadStatus === "downloading"}
                />
              </div>
            )}
          </div>

          {/* 記事タイトル: ellipsisで1行に省略 */}
          {title && (
            <h2
              className="text-sm sm:text-lg text-gray-600 dark:text-gray-400 mb-2 truncate"
              title={title}
            >
              {title}
            </h2>
          )}

          {/* URL入力フォーム: チャンクがない場合のみ表示 */}
          {chunks.length === 0 && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="記事のURLを入力してください"
                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
                required
              />

              <div className="flex gap-2 items-center">
                <label className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  追加先:
                </label>
                <select
                  value={selectedPlaylistId}
                  onChange={(e) => setSelectedPlaylistId(e.target.value)}
                  className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {isLoading ? "読込中" : "読込"}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="mt-2 text-red-600 dark:text-red-400 text-xs sm:text-sm">
              {error}
            </div>
          )}
          {playbackError && (
            <div className="mt-2 text-red-600 dark:text-red-400 text-xs sm:text-sm">
              {playbackError}
            </div>
          )}
          {/* プレイリスト再生情報: コンパクト化 */}
          {isPlaylistMode && playlistState.isPlaylistMode && (
            <div className="mt-2 bg-violet-950/30 p-2 sm:p-3 rounded-lg border border-violet-900/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-400 truncate">
                    {playlistState.playlistName}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-500">
                    {currentPlaylistIndex + 1} / {playlistState.totalCount}
                  </p>
                </div>
                <div className="flex gap-1 sm:gap-2">
                  <button
                    onClick={() => {
                      if (currentPlaylistIndex > 0) {
                        navigateToPlaylistItem(currentPlaylistIndex - 1);
                      }
                    }}
                    disabled={currentPlaylistIndex === 0}
                    className="px-2 sm:px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs sm:text-sm"
                    title="前の記事"
                  >
                    <SkipBack className="size-3 sm:size-4" />
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
                    className="px-2 sm:px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs sm:text-sm"
                    title="次の記事"
                  >
                    <span className="hidden sm:inline">次へ</span>
                    <SkipForward className="size-3 sm:size-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 再生コントロール: デスクトップのみ */}
          {chunks.length > 0 && (
            <div className="hidden sm:flex mt-2 flex-col gap-2">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <button
                  onClick={isPlaying ? pause : play}
                  disabled={isPlaybackLoading}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1 sm:gap-2 text-sm"
                  title={
                    isPlaybackLoading
                      ? "処理中..."
                      : isPlaying
                      ? "一時停止"
                      : "再生"
                  }
                >
                  {isPlaying ? (
                    <Pause className="size-4 sm:size-5" />
                  ) : (
                    <Play className="size-4 sm:size-5" />
                  )}
                  <span className="hidden sm:inline">
                    {isPlaybackLoading
                      ? "処理中"
                      : isPlaying
                      ? "一時停止"
                      : "再生"}
                  </span>
                </button>
                <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                  <label
                    htmlFor="playback-rate"
                    className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
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
                    onChange={handlePlaybackRateChange}
                    className="w-16 sm:w-24"
                  />
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 w-8 sm:w-12">
                    {playbackRate.toFixed(1)}x
                  </span>
                </div>
              </div>
              {/* プレイリスト追加ボタン */}
              {articleId && (
                <button
                  onClick={() => setIsPlaylistModalOpen(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm"
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
      <main className="flex-1 overflow-hidden pb-32 sm:pb-0">
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
            articleUrl={url}
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

      {/* モバイル版再生コントロール: 画面下部 */}
      {chunks.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
          <div className="flex flex-col gap-3">
            {/* 再生ボタン */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={isPlaying ? pause : play}
                disabled={isPlaybackLoading}
                className="px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-lg"
                title={
                  isPlaybackLoading
                    ? "処理中..."
                    : isPlaying
                    ? "一時停止"
                    : "再生"
                }
              >
                {isPlaying ? (
                  <Pause className="size-6" />
                ) : (
                  <Play className="size-6" />
                )}
              </button>
            </div>
            {/* 速度コントロール */}
            <div className="flex items-center justify-center gap-3">
              <label
                htmlFor="playback-rate-mobile"
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                速度:
              </label>
              <input
                id="playback-rate-mobile"
                type="range"
                min="0.8"
                max="3.0"
                step="0.1"
                value={playbackRate}
                onChange={handlePlaybackRateChange}
                className="w-32"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                {playbackRate.toFixed(1)}x
              </span>
            </div>
            {/* プレイリスト追加ボタン */}
            {articleId && (
              <button
                onClick={() => setIsPlaylistModalOpen(true)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                title="プレイリストに追加"
              >
                📋 プレイリストに追加
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
