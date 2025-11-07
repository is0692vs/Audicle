"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReaderView from "@/components/ReaderView";
import { PlaylistSelectorModal } from "@/components/PlaylistSelectorModal";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Chunk } from "@/types/api";
import { extractContent } from "@/lib/api";
import { usePlayback } from "@/hooks/usePlayback";
import { articleStorage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { parseHTMLToParagraphs } from "@/lib/paragraphParser";
import { UserSettings, DEFAULT_SETTINGS } from "@/types/settings";

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
  const articleId = searchParams.get("id");
  const urlFromQuery = searchParams.get("url");

  const [url, setUrl] = useState("");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

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
  });

  // 記事を読み込んで保存する共通ロジック
  const loadAndSaveArticle = useCallback(
    async (articleUrl: string) => {
      try {
        const response = await extractContent(articleUrl);
        const chunksWithId = convertParagraphsToChunks(response.content);
        setChunks(chunksWithId);
        setTitle(response.title);

        // Supabaseにブックマークを保存（デフォルトプレイリストに自動追加）
        let newBookmarkId: string | null = null;
        try {
          const bookmarkResponse = await fetch("/api/bookmarks", {
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
          });

          if (bookmarkResponse.ok) {
            const bookmarkData = await bookmarkResponse.json();
            newBookmarkId = bookmarkData.id;
            setBookmarkId(newBookmarkId);
            logger.success("ブックマークを保存", {
              id: newBookmarkId,
              url: articleUrl,
              title: response.title,
            });
          } else {
            logger.error(
              "ブックマークの保存に失敗",
              await bookmarkResponse.text()
            );
          }
        } catch (bookmarkError) {
          logger.error("ブックマークの保存に失敗", bookmarkError);
        }

        // ローカルストレージに保存（サーバーIDを優先）
        const newArticle = articleStorage.upsert({
          id: newBookmarkId || undefined, // サーバーIDがあれば使用
          url: articleUrl,
          title: response.title,
          chunks: chunksWithId,
        });

        logger.success("記事を保存", {
          id: newArticle.id,
          title: newArticle.title,
          chunkCount: chunksWithId.length,
        });

        // URLに記事IDを追加（サーバーIDを優先）
        router.push(`/reader?id=${newBookmarkId || newArticle.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
        logger.error("記事の抽出に失敗", err);
      }
    },
    [router]
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

  // 記事IDが指定されている場合は読み込み
  useEffect(() => {
    if (articleId) {
      const article = articleStorage.getById(articleId);
      if (article) {
        logger.info("記事を読み込み", { id: articleId, title: article.title });
        setTitle(article.title);
        setChunks(article.chunks);
        setUrl(article.url);
        setBookmarkId(articleId);
      } else {
        logger.warn("記事が見つかりません", { id: articleId });
        setError("記事が見つかりませんでした");
      }
    }
  }, [articleId]);

  // URLクエリパラメータが指定されている場合は記事を自動取得
  useEffect(() => {
    if (urlFromQuery) {
      setUrl(urlFromQuery);
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
        router.push(`/reader?id=${existingArticle.id}`);
      } else {
        // 新しい記事の場合は取得
        loadAndSaveArticle(urlFromQuery);
      }
    }
  }, [urlFromQuery, router, loadAndSaveArticle]);

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* ヘッダー: タイトルと再生コントロール */}
        {chunks.length > 0 && (
          <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
            <div className="max-w-4xl mx-auto p-4">
              {title && (
                <h2 className="text-lg text-zinc-200 mb-3 line-clamp-2">
                  {title}
                </h2>
              )}

              {/* 再生コントロール */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2">
                  <Button
                    onClick={isPlaying ? pause : play}
                    disabled={isPlaybackLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
                  >
                    {isPlaybackLoading
                      ? "処理中..."
                      : isPlaying
                      ? "⏸️ 一時停止"
                      : "▶️ 再生"}
                  </Button>
                  <Button
                    onClick={stop}
                    disabled={!isPlaying && !isPlaybackLoading}
                    variant="outline"
                    className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                  >
                    ⏹️ 停止
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="playback-rate"
                    className="text-sm text-zinc-400"
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
                    className="w-32"
                  />
                  <span className="text-sm text-zinc-300 w-12">
                    {playbackRate.toFixed(1)}x
                  </span>
                </div>
                {/* プレイリスト追加ボタン */}
                {bookmarkId && (
                  <Button
                    onClick={() => setIsPlaylistModalOpen(true)}
                    variant="outline"
                    className="border-purple-600 text-purple-400 hover:bg-purple-950 ml-auto"
                  >
                    📋 プレイリストに追加
                  </Button>
                )}
              </div>

              {error && (
                <div className="mt-2 text-red-400 text-sm">{error}</div>
              )}
              {playbackError && (
                <div className="mt-2 text-red-400 text-sm">{playbackError}</div>
              )}
            </div>
          </div>
        )}

        {/* メインコンテンツ: リーダービュー */}
        <div className="flex-1 overflow-hidden">
          <ReaderView
            chunks={chunks}
            currentChunkId={currentChunkId}
            articleUrl={url}
            voiceModel={settings.voice_model}
            speed={playbackRate}
            onChunkClick={seekToChunk}
          />
        </div>
      </div>

      {/* プレイリストセレクターモーダル */}
      {bookmarkId && (
        <PlaylistSelectorModal
          isOpen={isPlaylistModalOpen}
          onClose={() => setIsPlaylistModalOpen(false)}
          bookmarkId={bookmarkId}
          articleTitle={title}
        />
      )}
    </AppLayout>
  );
}
