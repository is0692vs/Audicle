"use client";

import { useEffect, useMemo, useRef } from "react";

import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useDownload } from "@/hooks/useDownload";
import { cn } from "@/lib/utils";
import { Chunk } from "@/types/api";
import { logger } from "@/lib/logger";

interface ReaderViewProps {
  chunks?: Chunk[];
  currentChunkId?: string;
  articleUrl?: string;
  voiceModel?: string;
  speed?: number;
  onChunkClick?: (chunkId: string) => void;
}

export default function ReaderView({
  chunks = [],
  currentChunkId,
  articleUrl = "",
  voiceModel,
  speed,
  onChunkClick,
}: ReaderViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const chunkCount = chunks.length;

  useEffect(() => {
    if (!articleUrl) return;
    logger.info("ReaderView received articleUrl", {
      articleUrl,
      chunkCount,
    });
  }, [articleUrl, chunkCount]);

  const primaryHeading = useMemo(
    () => chunks.find((chunk) => /^h[1-3]$/.test(chunk.type))?.text,
    [chunks]
  );

  const articleTitle = useMemo(() => {
    if (primaryHeading) return primaryHeading;
    if (!articleUrl) return "記事ビュー";
    try {
      const url = new URL(articleUrl);
      return url.hostname;
    } catch {
      return "記事ビュー";
    }
  }, [primaryHeading, articleUrl]);

  // ダウンロード機能
  const {
    status: downloadStatus,
    progress,
    error: downloadError,
    estimatedTime,
    startDownload,
    cancelDownload,
  } = useDownload({
    articleUrl,
    chunks,
    voiceModel,
    speed,
  });

  // 自動スクロール: 再生中のチャンクが変わったら画面中央にスクロール
  // Chrome拡張版と同等の動作を提供
  useAutoScroll({
    currentChunkId,
    // containerRef, // 一時的にコメントアウトしてwindowスクロールを使用
    enabled: true,
    delay: 0,
  });

  const renderDownloadPanel = () => {
    if (downloadStatus === "idle" || downloadStatus === "completed") {
      if (!downloadError) {
        return null;
      }
    }

    const percentage = progress.total
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

    const statusMeta: Record<
      "downloading" | "error" | "cancelled",
      { icon: string; label: string; tone: string }
    > = {
      downloading: {
        icon: "⬇️",
        label: "音声ファイルを準備中...",
        tone: "text-violet-400",
      },
      error: {
        icon: "⚠️",
        label: "ダウンロードに失敗しました",
        tone: "text-red-400",
      },
      cancelled: {
        icon: "⏹️",
        label: "ダウンロードをキャンセルしました",
        tone: "text-yellow-400",
      },
    };

    const activeMeta = statusMeta[downloadStatus as keyof typeof statusMeta];

    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className={cn(
              "flex items-center gap-2 text-sm font-semibold",
              activeMeta?.tone ?? "text-zinc-300"
            )}
          >
            <span className="text-lg" aria-hidden>
              {activeMeta?.icon ?? "ℹ️"}
            </span>
            <span>{activeMeta?.label ?? "ステータス"}</span>
          </div>
          {progress.total > 0 && (
            <span className="text-sm text-zinc-400">
              {progress.current} / {progress.total} ({percentage}%)
            </span>
          )}
        </div>

        {progress.total > 0 && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-violet-600 transition-[width] duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}

        {downloadStatus === "downloading" && estimatedTime > 0 && (
          <p className="mt-3 text-xs text-zinc-400">
            {estimatedTime < 60
              ? `残り約 ${Math.round(estimatedTime)} 秒`
              : `残り約 ${Math.round(estimatedTime / 60)} 分`}
          </p>
        )}

        {downloadError && (
          <p className="mt-3 text-sm text-red-400">{downloadError}</p>
        )}

        {downloadStatus === "downloading" && (
          <button
            onClick={cancelDownload}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-800"
          >
            キャンセル
          </button>
        )}
      </div>
    );
  };

  const downloadButtonLabel = useMemo(() => {
    switch (downloadStatus) {
      case "downloading":
        return "音声を準備中...";
      case "error":
        return "再試行";
      case "cancelled":
        return "もう一度ダウンロード";
      default:
        return "全文をダウンロード";
    }
  }, [downloadStatus]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-black px-4 py-8"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {chunks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900 px-10 py-16 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-zinc-800 text-2xl">
              📖
            </div>
            <h2 className="mt-6 text-2xl font-semibold">
              読み上げたい記事のURLを入力してください
            </h2>
            <p className="mt-4 text-sm text-zinc-400">
              記事を解析して、読みやすいチャンクに分割したビューと音声ダウンロード機能を提供します。
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              プレイリストや設定は右上のメニューから引き続き利用できます。
            </p>
          </div>
        ) : (
          <>
            {renderDownloadPanel()}

            <section className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-zinc-900 via-transparent to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-zinc-900 via-transparent to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-zinc-900 via-transparent to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                <div className="space-y-3 sm:space-y-4">
                  {chunks.map((chunk) => {
                    const isActive = chunk.id === currentChunkId;
                    const isHeading = /^h[1-6]$/.test(chunk.type);
                    const isListItem = chunk.type === "li";
                    const isBlockquote = chunk.type === "blockquote";

                    const headingFontSizeMap: Record<number, string> = {
                      1: "text-3xl",
                      2: "text-2xl",
                      3: "text-xl",
                      4: "text-lg",
                      5: "text-base",
                      6: "text-sm",
                    };

                    let typography = "text-lg leading-relaxed text-zinc-300";
                    if (isHeading) {
                      const level = parseInt(chunk.type.charAt(1), 10);
                      const fontSize = headingFontSizeMap[level] ?? "text-xl";
                      typography = cn(fontSize, "font-semibold");
                    } else if (isListItem) {
                      typography = "text-lg leading-relaxed text-zinc-300 ml-6";
                    } else if (isBlockquote) {
                      typography =
                        "text-lg leading-relaxed text-zinc-300 border-l-4 border-zinc-700 pl-4 italic";
                    }

                    return (
                      <div
                        key={chunk.id}
                        data-audicle-id={chunk.id}
                        onClick={() => onChunkClick?.(chunk.id)}
                        className={cn(
                          "group cursor-pointer rounded-lg border border-transparent bg-zinc-800/50 px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 hover:border-violet-500/30 hover:bg-zinc-800",
                          isActive
                            ? "border-violet-500/60 bg-violet-900/30 ring-2 ring-violet-500/40"
                            : ""
                        )}
                      >
                        <div
                          className={cn(
                            "whitespace-pre-wrap text-base sm:text-lg",
                            typography,
                            isActive && !isHeading ? "font-medium" : undefined
                          )}
                        >
                          {chunk.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
