"use client"

import type { Chunk } from "@/types/api"
import { useRef } from "react"

interface ReaderViewProps {
  chunks?: Chunk[]
  currentChunkId?: string
  articleUrl?: string
  voiceModel?: string
  speed?: number
  onChunkClick?: (chunkId: string) => void
}

export default function ReaderView({
  chunks = [],
  currentChunkId,
  articleUrl = "",
  voiceModel,
  speed,
  onChunkClick,
}: ReaderViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const downloadStatus = "idle"
  const progress = { current: 0, total: 0 }
  const downloadError = null
  const estimatedTime = 0

  // useAutoScroll({
  //   currentChunkId,
  //   enabled: true,
  //   delay: 0,
  // });

  // 進行状況の表示（現在は非表示）
  const renderProgressBar = () => {
    if (downloadStatus === "idle" || downloadStatus === "completed") {
      return null
    }

    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

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
        {downloadError && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{downloadError}</p>}

        {/* キャンセルボタン */}
        {downloadStatus === "downloading" && (
          <button
            onClick={() => {}}
            className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            キャンセル
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {chunks.length === 0 ? (
          <div className="text-center text-zinc-500 mt-20">
            <p className="text-lg">URLを入力して記事を読み込んでください</p>
          </div>
        ) : (
          <>
            {/* {articleUrl && (
              <div className="mb-6 flex items-center gap-3">
                {downloadStatus === "idle" && (
                  <button
                    onClick={() => {}}
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
            )} */}

            {/* 進行状況バー */}
            {renderProgressBar()}

            {/* チャンク一覧 */}
            <div className="space-y-6">
              {chunks.map((chunk) => {
                const isActive = chunk.id === currentChunkId
                const isHeading = /^h[1-6]$/.test(chunk.type)
                const isListItem = chunk.type === "li"
                const isBlockquote = chunk.type === "blockquote"

                // 見出しレベルのフォントサイズマッピング
                const headingFontSizeMap: Record<number, string> = {
                  1: "text-3xl lg:text-4xl",
                  2: "text-2xl lg:text-3xl",
                  3: "text-xl lg:text-2xl",
                  4: "text-lg lg:text-xl",
                  5: "text-base lg:text-lg",
                  6: "text-sm lg:text-base",
                }

                // 段落タイプに応じた基本スタイル
                let baseStyle = "text-lg lg:text-2xl leading-relaxed"
                if (isHeading) {
                  // 見出しは太字で大きめ
                  const headingLevel = Number.parseInt(chunk.type.charAt(1))
                  const fontSize = headingFontSizeMap[headingLevel] || "text-lg lg:text-2xl"
                  baseStyle = `${fontSize} font-bold leading-tight`
                } else if (isListItem) {
                  // リストアイテムは左にマージン
                  baseStyle = "text-lg lg:text-2xl leading-relaxed ml-6"
                } else if (isBlockquote) {
                  // 引用は左にボーダーとパディング
                  baseStyle = "text-lg lg:text-2xl leading-relaxed border-l-4 border-zinc-700 pl-4 italic"
                }

                return (
                  <div
                    key={chunk.id}
                    data-audicle-id={chunk.id}
                    onClick={() => onChunkClick?.(chunk.id)}
                    className={`
                    ${baseStyle}
                    cursor-pointer transition-all duration-500 p-4 rounded-lg
                    ${
                      isActive
                        ? "text-white font-semibold scale-105 lg:scale-110 bg-gradient-to-r from-violet-900/30 to-purple-900/30"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                    }
                  `}
                  >
                    {chunk.text}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
