"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useDownload } from "@/hooks/useDownload";
import { cn } from "@/lib/utils";
import { Chunk } from "@/types/api";
import { logger } from "@/lib/logger";
import ReaderChunk from "./ReaderChunk";

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
  const [gradientState, setGradientState] = useState({
    top: false,
    bottom: false,
    enabled: false,
  });
  const [chunkListPaddingBottom, setChunkListPaddingBottom] = useState(0);

  const chunkCount = chunks.length;
  const chunkSignature = useMemo(
    () => chunks.map((chunk) => chunk.id).join("|"),
    [chunks]
  );

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
    containerRef,
    enabled: true,
    delay: 0,
  });

  // Keep gradient overlays and padding in sync with scroll position and container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const MIN_SPACER_PX = 120;

    const updateGradientState = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const hasOverflow = scrollHeight - clientHeight > 4;
      if (!hasOverflow) {
        setGradientState((prev) =>
          prev.enabled ? { top: false, bottom: false, enabled: false } : prev
        );
        return;
      }

      const epsilon = 4;
      const nextState = {
        top: scrollTop > epsilon,
        bottom: scrollTop + clientHeight < scrollHeight - epsilon,
        enabled: true,
      };

      setGradientState((prev) =>
        prev.top === nextState.top &&
        prev.bottom === nextState.bottom &&
        prev.enabled === nextState.enabled
          ? prev
          : nextState
      );
    };

    const updatePadding = () => {
      const nextPadding = Math.max(
        Math.round(container.clientHeight / 2),
        MIN_SPACER_PX
      );
      setChunkListPaddingBottom((prev) =>
        prev === nextPadding ? prev : nextPadding
      );
    };

    const handleResize = () => {
      updateGradientState();
      updatePadding();
    };

    updateGradientState();
    updatePadding();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(handleResize)
        : undefined;

    // Scroll optimization: Throttle scroll event updates using requestAnimationFrame
    // to prevent excessive reflows and main thread blocking during scrolling.
    let ticking = false;
    let rafId: number;

    const onScroll = () => {
      if (!ticking) {
        rafId = window.requestAnimationFrame(() => {
          updateGradientState();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", onScroll, {
      passive: true,
    });
    resizeObserver?.observe(container);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      container.removeEventListener("scroll", onScroll);
      resizeObserver?.disconnect();
    };
  }, [chunkSignature]);

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
        tone: "text-primary/70",
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
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
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
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-zinc-900 via-transparent to-transparent transition-opacity duration-300",
                  gradientState.enabled && gradientState.top
                    ? "opacity-100"
                    : "opacity-0"
                )}
              />
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-900 via-transparent to-transparent transition-opacity duration-300",
                  gradientState.enabled && gradientState.bottom
                    ? "opacity-100"
                    : "opacity-0"
                )}
              />
              <div
                className="space-y-3 sm:space-y-4"
                style={{
                  paddingBottom: chunkListPaddingBottom
                    ? `${chunkListPaddingBottom}px`
                    : undefined,
                }}
              >
                {chunks.map((chunk) => (
                  <ReaderChunk
                    key={chunk.id}
                    chunk={chunk}
                    isActive={chunk.id === currentChunkId}
                    onClick={onChunkClick}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
