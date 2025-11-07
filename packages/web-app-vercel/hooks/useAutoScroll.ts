"use client";

import { useEffect, useRef } from "react";

/**
 * 読み上げ中の段落へ自動スクロールするカスタムフック
 * 
 * Chrome拡張版と同等のユーザー体験を提供
 * - チャンク切り替え時に自動スクロール
 * - スムーズスクロール（behavior: 'smooth'）
 * - 画面中央付近に表示（block: 'center'）
 * - モバイルデバイス対応
 */

interface UseAutoScrollProps {
    /**
     * 現在再生中のチャンクID
     */
    currentChunkId?: string;

    /**
     * スクロール対象となるコンテナ要素の参照
     * 指定しない場合はwindowをスクロール対象とする
     */
    containerRef?: React.RefObject<HTMLElement>;

    /**
     * スクロール有効化フラグ
     * @default true
     */
    enabled?: boolean;

    /**
     * スクロール時の遅延（ミリ秒）
     * チャンク切り替えのタイミングに合わせるために使用
     * @default 0
     */
    delay?: number;
}

export function useAutoScroll({
    currentChunkId,
    containerRef,
    enabled = true,
    delay = 0,
}: UseAutoScrollProps) {
    const elementRefCache = useRef<Map<string, Element | null>>(new Map());

    useEffect(() => {
        if (!enabled || !currentChunkId) {
            return;
        }

        // 遅延がある場合はタイマーを使用
        const timer = setTimeout(() => {
            // data-audicle-id属性でチャンクを検索
            const element = document.querySelector(
                `[data-audicle-id="${CSS.escape(currentChunkId)}"]`
            );

            if (!element) {
                console.warn(
                    `[useAutoScroll] チャンクが見つかりません: ${currentChunkId}`
                );
                return;
            }

            try {
                // containerRefが指定されている場合
                if (containerRef?.current) {
                    const container = containerRef.current;
                    const elementRect = element.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();

                    // コンテナの中央に要素を配置するためのスクロール位置を計算
                    const scrollTop =
                        container.scrollTop +
                        elementRect.top -
                        containerRect.top -
                        containerRect.height / 2 +
                        elementRect.height / 2;

                    container.scrollTo({
                        top: scrollTop,
                        behavior: "smooth",
                        left: 0,
                    });

                    console.log(
                        `[useAutoScroll] コンテナ内スクロール: chunkId=${currentChunkId}, scrollTop=${Math.round(scrollTop)}`
                    );
                } else {
                    // windowをスクロール対象とする場合
                    // scrollIntoViewを使用（Chrome拡張版と同等）
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "nearest",
                    });

                    console.log(
                        `[useAutoScroll] ウィンドウスクロール: chunkId=${currentChunkId}`
                    );
                }
            } catch (error) {
                console.warn(`[useAutoScroll] スクロール失敗:`, error);
                // フォールバック: 古いブラウザ対応
                try {
                    element.scrollIntoView(true);
                } catch (fallbackError) {
                    console.error(
                        `[useAutoScroll] フォールバックスクロール失敗:`,
                        fallbackError
                    );
                }
            }
        }, delay);

        return () => clearTimeout(timer);
    }, [currentChunkId, containerRef, enabled, delay]);
}

/**
 * 別の実装方法: useRefを使用した参照キャッシュ版
 * （必要に応じてこちらを使用）
 */
export function useAutoScrollWithCache({
    currentChunkId,
    containerRef,
    enabled = true,
    delay = 0,
    cacheSize = 10,
}: UseAutoScrollProps & { cacheSize?: number }) {
    const elementRefCache = useRef<Map<string, Element | null>>(new Map());

    // キャッシュサイズを制限する処理
    const setCachedElement = (id: string, element: Element | null) => {
        if (elementRefCache.current.size >= cacheSize && !elementRefCache.current.has(id)) {
            // 最も古いエントリを削除（LRU的な動作）
            const firstKey = elementRefCache.current.keys().next().value;
            elementRefCache.current.delete(firstKey);
        }
        elementRefCache.current.set(id, element);
    };

    useEffect(() => {
        if (!enabled || !currentChunkId) {
            return;
        }

        const timer = setTimeout(() => {
            // キャッシュから検索
            let element = elementRefCache.current.get(currentChunkId);

            if (!element) {
                // キャッシュミス: DOM検索
                element = document.querySelector(
                    `[data-audicle-id="${CSS.escape(currentChunkId)}"]`
                );

                if (element) {
                    setCachedElement(currentChunkId, element);
                }
            }

            if (!element) {
                console.warn(
                    `[useAutoScrollWithCache] チャンクが見つかりません: ${currentChunkId}`
                );
                return;
            }

            try {
                if (containerRef?.current) {
                    const container = containerRef.current;
                    const elementRect = element.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();

                    const scrollTop =
                        container.scrollTop +
                        elementRect.top -
                        containerRect.top -
                        containerRect.height / 2 +
                        elementRect.height / 2;

                    container.scrollTo({
                        top: scrollTop,
                        behavior: "smooth",
                        left: 0,
                    });

                    console.log(
                        `[useAutoScrollWithCache] コンテナ内スクロール: chunkId=${currentChunkId}`
                    );
                } else {
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "nearest",
                    });

                    console.log(
                        `[useAutoScrollWithCache] ウィンドウスクロール: chunkId=${currentChunkId}`
                    );
                }
            } catch (error) {
                console.warn(`[useAutoScrollWithCache] スクロール失敗:`, error);
                try {
                    element.scrollIntoView(true);
                } catch (fallbackError) {
                    console.error(
                        `[useAutoScrollWithCache] フォールバックスクロール失敗:`,
                        fallbackError
                    );
                }
            }
        }, delay);

        return () => clearTimeout(timer);
    }, [currentChunkId, containerRef, enabled, delay, cacheSize]);
}
