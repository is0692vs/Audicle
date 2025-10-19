"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReaderView from "@/components/ReaderView";
import { Chunk } from "@/types/api";
import { extractContent } from "@/lib/api";
import { usePlayback } from "@/hooks/usePlayback";
import { articleStorage, type Article } from "@/lib/storage";
import { logger } from "@/lib/logger";

export default function ReaderPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleId = searchParams.get("id");

  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

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
  } = usePlayback({ chunks });

  // 記事IDが指定されている場合は読み込み
  useEffect(() => {
    if (articleId) {
      const article = articleStorage.getById(articleId);
      if (article) {
        logger.info("記事を読み込み", { id: articleId, title: article.title });
        setTitle(article.title);
        setChunks(article.chunks);
        setUrl(article.url);
      } else {
        logger.warn("記事が見つかりません", { id: articleId });
        setError("記事が見つかりませんでした");
      }
    }
  }, [articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await extractContent(url);

      // chunksにIDを付与
      const chunksWithId: Chunk[] = response.chunks.map((text, index) => ({
        id: `chunk-${index}`,
        text,
      }));

      setChunks(chunksWithId);
      setTitle(response.title);

      // 記事を保存
      const newArticle: Article = {
        id: Date.now().toString(),
        url,
        title: response.title,
        chunks: chunksWithId,
        createdAt: Date.now(),
      };
      articleStorage.add(newArticle);
      logger.success("記事を保存", {
        id: newArticle.id,
        title: newArticle.title,
      });

      // URLに記事IDを追加
      router.push(`/reader?id=${newArticle.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      logger.error("記事の抽出に失敗", err);
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold">Auticle</h1>
          </div>
          {title && (
            <h2 className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {title}
            </h2>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="記事のURLを入力してください"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "読込中..." : "読込"}
            </button>
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

          {/* 再生コントロール */}
          {chunks.length > 0 && (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={isPlaying ? pause : play}
                  disabled={isPlaybackLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isPlaybackLoading
                    ? "処理中..."
                    : isPlaying
                    ? "一時停止"
                    : "再生"}
                </button>
                <button
                  onClick={stop}
                  disabled={!isPlaying && !isPlaybackLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  停止
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="playback-rate"
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  再生速度:
                </label>
                <input
                  id="playback-rate"
                  type="range"
                  min="0.8"
                  max="3.0"
                  step="0.1"
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                  {playbackRate.toFixed(1)}x
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ: リーダービュー */}
      <main className="flex-1 overflow-hidden">
        <ReaderView
          chunks={chunks}
          currentChunkId={currentChunkId}
          onChunkClick={seekToChunk}
        />
      </main>
    </div>
  );
}