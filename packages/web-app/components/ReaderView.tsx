"use client";

import { Chunk } from "@/types/api";
import { useEffect, useRef } from "react";
import { ReaderChunk } from "./ReaderChunk";

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
  const activeChunkRef = useRef<HTMLParagraphElement>(null);
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
      className="h-full max-h-[80vh] sm:max-h-[calc(100vh-8rem-5rem)] overflow-y-auto bg-gray-50 dark:bg-gray-950"
    >
      <div className="max-w-3xl mx-auto px-4 py-8">
        {chunks.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
            <p className="text-lg">URLを入力して記事を読み込んでください</p>
          </div>
        ) : (
          <div className="space-y-6">
            {chunks.map((chunk) => {
              const isActive = chunk.id === currentChunkId;
              return (
                <ReaderChunk
                  key={chunk.id}
                  chunk={chunk}
                  isActive={isActive}
                  onClick={onChunkClick}
                  ref={isActive ? activeChunkRef : null}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
