"use client";

import { Chunk } from "@/types/api";
import { useEffect, useRef } from "react";

interface ReaderViewProps {
  chunks?: Chunk[];
  currentChunkId?: string;
  onChunkClick?: (chunkId: string) => void;
}

export default function ReaderView({
  chunks = [],
  currentChunkId,
  onChunkClick,
}: ReaderViewProps) {
  const activeChunkRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
          <div className="space-y-4">
            {chunks.map((chunk) => {
              const isActive = chunk.id === currentChunkId;
              const isHeading = /^h[1-6]$/.test(chunk.type);
              const isListItem = chunk.type === 'li';
              const isBlockquote = chunk.type === 'blockquote';
              
              // 段落タイプに応じた基本スタイル
              let baseStyle = "text-lg leading-relaxed";
              if (isHeading) {
                // 見出しは太字で大きめ
                const headingLevel = parseInt(chunk.type.charAt(1));
                const fontSize = headingLevel === 1 ? "text-3xl" : 
                                 headingLevel === 2 ? "text-2xl" : 
                                 headingLevel === 3 ? "text-xl" : "text-lg";
                baseStyle = `${fontSize} font-bold leading-tight`;
              } else if (isListItem) {
                // リストアイテムは左にマージン
                baseStyle = "text-lg leading-relaxed ml-6";
              } else if (isBlockquote) {
                // 引用は左にボーダーとパディング
                baseStyle = "text-lg leading-relaxed border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic";
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
        )}
      </div>
    </div>
  );
}
