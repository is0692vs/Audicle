"use client";

import { useMemo, useRef } from "react";

import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useDownload } from "@/hooks/useDownload";
import { cn } from "@/lib/utils";
import { Chunk } from "@/types/api";

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

  const primaryHeading = useMemo(
    () => chunks.find((chunk) => /^h[1-3]$/.test(chunk.type))?.text,
    [chunks]
  );

  const articleTitle =
    primaryHeading ??
    (() => {
      if (!articleUrl) return "記事ビュー";
      try {
        const url = new URL(articleUrl);
        return url.hostname;
      } catch {
        return "記事ビュー";
      }
    })();

  const formattedSpeed = useMemo(() => {
    if (!speed) return "1x";
    const fixed = speed.toFixed(2).replace(/\.0+$/, "");
    return `${fixed}x`;
  }, [speed]);

  const totalSections = chunks.length;

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
        tone: "text-sky-700 dark:text-sky-200",
      },
      error: {
        icon: "⚠️",
        label: "ダウンロードに失敗しました",
        tone: "text-rose-700 dark:text-rose-300",
      },
      cancelled: {
        icon: "⏹️",
        label: "ダウンロードをキャンセルしました",
        tone: "text-amber-700 dark:text-amber-200",
      },
    };

    const activeMeta = statusMeta[downloadStatus as keyof typeof statusMeta];

    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className={cn(
              "flex items-center gap-2 text-sm font-semibold",
              activeMeta?.tone ?? "text-slate-700 dark:text-slate-200"
            )}
          >
            <span className="text-lg" aria-hidden>
              {activeMeta?.icon ?? "ℹ️"}
            </span>
            <span>{activeMeta?.label ?? "ステータス"}</span>
          </div>
          {progress.total > 0 && (
            <span className="text-sm text-slate-500 dark:text-slate-300">
              {progress.current} / {progress.total} ({percentage}%)
            </span>
          )}
        </div>

        {progress.total > 0 && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/50">
            <div
              className="h-full rounded-full bg-sky-500 transition-[width] duration-300 ease-out dark:bg-sky-400"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}

        {downloadStatus === "downloading" && estimatedTime > 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">
            {estimatedTime < 60
              ? `残り約 ${Math.round(estimatedTime)} 秒`
              : `残り約 ${Math.round(estimatedTime / 60)} 分`}
          </p>
        )}

        {downloadError && (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
            {downloadError}
          </p>
        )}

        {downloadStatus === "downloading" && (
          <button
            onClick={cancelDownload}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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
      className="h-full overflow-y-auto bg-gradient-to-br from-slate-100 via-white to-slate-100 px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {chunks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-10 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-200/80 text-2xl dark:bg-slate-800/80">
              📖
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-slate-800 dark:text-slate-100">
              読み上げたい記事のURLを入力してください
            </h2>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              記事を解析して、読みやすいチャンクに分割したビューと音声ダウンロード機能を提供します。
            </p>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              プレイリストや設定は右上のメニューから引き続き利用できます。
            </p>
          </div>
        ) : (
          <>
            <header className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-black/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Now reading
                  </p>
                  <h1 className="mt-2 line-clamp-2 text-2xl font-semibold leading-snug text-slate-900 dark:text-slate-50 md:text-3xl">
                    {articleTitle}
                  </h1>
                  {articleUrl && (
                    <a
                      href={articleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        ↗
                      </span>
                      元記事を新しいタブで開く
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    🗣️{" "}
                    <span className="truncate">
                      {voiceModel ?? "デフォルト音声"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    🎧 {formattedSpeed}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    📑 {totalSections} セクション
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {downloadStatus === "completed" ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <span aria-hidden>✅</span>
                    <span>オフライン対応完了（{chunks.length}チャンク）</span>
                  </div>
                ) : (
                  <button
                    onClick={startDownload}
                    disabled={downloadStatus === "downloading"}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-600 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {downloadStatus === "downloading" ? (
                      <span className="inline-flex size-4 items-center justify-center">
                        <span className="inline-flex size-4 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
                      </span>
                    ) : (
                      <span aria-hidden>⬇️</span>
                    )}
                    <span>{downloadButtonLabel}</span>
                  </button>
                )}
              </div>
            </header>

            {renderDownloadPanel()}

            <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-black/20">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-100/80 via-transparent to-transparent dark:from-slate-900/60" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-100/80 via-transparent to-transparent dark:from-slate-900/60" />
              <div className="relative max-h-[60vh] overflow-y-auto px-6 py-8 sm:max-h-[65vh]">
                <div className="space-y-4">
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

                    let typography =
                      "text-lg leading-relaxed text-slate-700 dark:text-slate-200";
                    if (isHeading) {
                      const level = parseInt(chunk.type.charAt(1), 10);
                      const fontSize = headingFontSizeMap[level] ?? "text-xl";
                      typography = cn(
                        fontSize,
                        "font-semibold text-slate-900 dark:text-slate-100"
                      );
                    } else if (isListItem) {
                      typography =
                        "text-lg leading-relaxed text-slate-700 dark:text-slate-200 ml-6";
                    } else if (isBlockquote) {
                      typography =
                        "text-lg leading-relaxed text-slate-700 dark:text-slate-200 border-l-4 border-slate-200/80 pl-4 italic dark:border-slate-600";
                    }

                    return (
                      <div
                        key={chunk.id}
                        data-audicle-id={chunk.id}
                        onClick={() => onChunkClick?.(chunk.id)}
                        className={cn(
                          "group cursor-pointer rounded-2xl border border-transparent bg-white/80 px-5 py-4 shadow-sm transition-all duration-200 hover:border-sky-200/60 hover:bg-white dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:bg-slate-900",
                          isActive
                            ? "border-sky-400/60 bg-sky-50 shadow-lg ring-2 ring-sky-200/60 dark:border-sky-400/60 dark:bg-sky-900/30 dark:ring-sky-500/40"
                            : ""
                        )}
                      >
                        <div
                          className={cn(
                            "whitespace-pre-wrap", // Preserve original spacing
                            typography,
                            isActive && !isHeading
                              ? "font-medium text-slate-900 dark:text-slate-100"
                              : undefined
                          )}
                        >
                          {chunk.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
