"use client";

import { Chunk } from "@/types/api";
import { useEffect, useRef } from "react";
import { useDownload } from "@/hooks/useDownload";

interface ReaderViewProps {
  chunks?: Chunk[];
  currentChunkId?: string;
  articleUrl?: string;
  voice?: string;
  speed?: number;
  onChunkClick?: (chunkId: string) => void;
}

export default function ReaderView({
  chunks = [],
  currentChunkId,
  articleUrl = "",
  voice,
  speed,
  onChunkClick,
}: ReaderViewProps) {
  const activeChunkRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    voiceModel: voice,
    speed,
  });

  // 自動スクロール: 再生中のチャンクが変わったら画面中央にスクロール
  useEffect(() => {
    if (currentChunkId && activeChunkRef.current && containerRef.current) {
      const element = activeChunkRef.current;
      const container = containerRef.current;

      // 要素の位置を取得
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // コンテナの中央に要素を配置するためのスクロール位置を計算
      const scrollTop =
        container.scrollTop +
        elementRect.top -
        containerRect.top -
        containerRect.height / 2 +
        elementRect.height / 2;

      // スムーズにスクロール
      container.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });
    }
  }, [currentChunkId]);

  // 進行状況の表示
  const renderProgressBar = () => {
    if (downloadStatus === "idle" || downloadStatus === "completed") {
      return null;
    }

    const percentage =
      progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

    return (
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {downloadStatus === "downloading" && "⬇️ ダウンロード中..."}
            {downloadStatus === "error" && "⚠️ エラー"}
            {downloadStatus === "cancelled" && "❌ キャンセル済み"}
          </span>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {progress.current} / {progress.total} ({Math.round(percentage)}%)
          </span>
        </div>

        {/* プログレスバー */}
        <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 mb-2">
          <div
            className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* 推定残り時間 */}
        {downloadStatus === "downloading" && estimatedTime > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {estimatedTime < 60
              ? `残り約 ${Math.round(estimatedTime)} 秒`
              : `残り約 ${Math.round(estimatedTime / 60)} 分`}
          </p>
        )}

        {/* エラーメッセージ */}
        {downloadError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            {downloadError}
          </p>
        )}

        {/* キャンセルボタン */}
        {downloadStatus === "downloading" && (
          <button
            onClick={cancelDownload}
            className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            キャンセル
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950"
    >
      <div className="max-w-3xl mx-auto px-4 py-8">
        {chunks.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
            <p className="text-lg">URLを入力して記事を読み込んでください</p>
          </div>
        ) : (
          <>
            {/* ダウンロードボタン */}
            {articleUrl && (
              <div className="mb-6 flex items-center gap-3">
                {downloadStatus === "idle" && (
                  <button
                    onClick={startDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <span>⬇️</span>
                    <span>全てダウンロード</span>
                  </button>
                )}
                {downloadStatus === "completed" && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg">
                    <span>✓</span>
                    <span>オフライン対応 ({chunks.length}チャンク)</span>
                  </div>
                )}
              </div>
            )}

            {/* 進行状況バー */}
            {renderProgressBar()}

            {/* チャンク一覧 */}
            <div className="space-y-4">
              {chunks.map((chunk) => {
                const isActive = chunk.id === currentChunkId;
                const isHeading = /^h[1-6]$/.test(chunk.type);
                const isListItem = chunk.type === "li";
                const isBlockquote = chunk.type === "blockquote";

                // 見出しレベルのフォントサイズマッピング
                const headingFontSizeMap: Record<number, string> = {
                  1: "text-3xl",
                  2: "text-2xl",
                  3: "text-xl",
                  4: "text-lg",
                  5: "text-base",
                  6: "text-sm",
                };

                // 段落タイプに応じた基本スタイル
                let baseStyle = "text-lg leading-relaxed";
                if (isHeading) {
                  // 見出しは太字で大きめ
                  const headingLevel = parseInt(chunk.type.charAt(1));
                  const fontSize =
                    headingFontSizeMap[headingLevel] || "text-lg";
                  baseStyle = `${fontSize} font-bold leading-tight`;
                } else if (isListItem) {
                  // リストアイテムは左にマージン
                  baseStyle = "text-lg leading-relaxed ml-6";
                } else if (isBlockquote) {
                  // 引用は左にボーダーとパディング
                  baseStyle =
                    "text-lg leading-relaxed border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic";
                }

                return (
                  <div
                    key={chunk.id}
                    ref={isActive ? activeChunkRef : null}
                    data-audicle-id={chunk.id}
                    onClick={() => onChunkClick?.(chunk.id)}
                    className={`
                    ${baseStyle}
                    cursor-pointer transition-all duration-200 p-4 rounded-lg
                    ${
                      isActive
                        ? "bg-yellow-100 dark:bg-yellow-900/30 font-medium scale-105 shadow-lg"
                        : "hover:bg-gray-100 dark:hover:bg-gray-900"
                    }
                  `}
                  >
                    {chunk.text}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
