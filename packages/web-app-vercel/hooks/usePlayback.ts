"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Chunk } from "@/types/api";
import { audioCache } from "@/lib/audioCache";
import { getAudioChunk } from "@/lib/indexedDB";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { synthesizeSpeech } from "@/lib/api";
import { logger } from "@/lib/logger";
import { needsPauseBefore, needsPauseAfter, getPauseDuration } from "@/lib/paragraphParser";

interface UsePlaybackProps {
  chunks: Chunk[];
  articleUrl?: string;
  voiceModel?: string;       // 音声モデル（例: 'ja-JP-Standard-B'）
  playbackSpeed?: number;    // 再生速度（例: 1.0, 1.5, 2.0）
  onChunkChange?: (chunkId: string) => void;
  onArticleEnd?: () => void; // 記事の再生終了時のコールバック
}

const PREFETCH_AHEAD = 3; // 3つ先まで先読み

// localStorage のキー定数
const PLAYBACK_RATE_STORAGE_KEY = "audicle-playback-rate";
const DEFAULT_PLAYBACK_RATE = 1.0;

/**
 * 指定時間待機する
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function usePlayback({ chunks, articleUrl, voiceModel, playbackSpeed, onChunkChange, onArticleEnd }: UsePlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY);
        return saved ? parseFloat(saved) : DEFAULT_PLAYBACK_RATE;
      } catch (error) {
        logger.warn("Failed to load playback rate from localStorage", error);
        return DEFAULT_PLAYBACK_RATE;
      }
    }
    return DEFAULT_PLAYBACK_RATE;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const onArticleEndRef = useRef<(() => void) | undefined>(onArticleEnd);
  // 再生処理が進行中かどうかを追跡するフラグ
  const isPlayingRequestInProgressRef = useRef<boolean>(false);
  // `playFromIndex` と `handleAudioEnded` の間の循環参照を解決するためのRef。
  // `handleAudioEnded` は `useCallback` でメモ化されていますが、内部で `playFromIndex` を呼び出す必要があります。
  // `playFromIndex` も `handleAudioEnded` に依存しているため、単純に依存配列に加えると循環参照が発生します。
  // このRefを通じて呼び出すことで、常に最新の `playFromIndex` を参照できるようにし、循環参照を回避します。
  const playFromIndexRef = useRef<(index: number) => Promise<void>>(async () => { });

  // 現在のチャンクID
  const currentChunkId =
    currentIndex >= 0 && currentIndex < chunks.length
      ? chunks[currentIndex].id
      : undefined;

  // onArticleEndRefを同期
  useEffect(() => {
    onArticleEndRef.current = onArticleEnd;
  }, [onArticleEnd]);

  // playbackRateの変更をlocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, playbackRate.toString());
    } catch (error) {
      logger.warn("Failed to save playback rate to localStorage", error);
    }
  }, [playbackRate]);

  // playbackSpeedプロパティの変更をplaybackRateに反映
  useEffect(() => {
    if (playbackSpeed !== undefined) {
      setPlaybackRate(playbackSpeed);
    }
  }, [playbackSpeed]);

  // playbackRateを設定する関数
  const updatePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    // localStorage を同期的に更新して競合状態を回避
    try {
      localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, rate.toString());
    } catch (error) {
      logger.warn("Failed to save playback rate to localStorage", error);
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  // onended ハンドラを共通化
  const handleAudioEnded = useCallback(async (currentIndex: number) => {
    const chunk = chunks[currentIndex];
    // 見出しの後、または段落間にポーズ
    if (needsPauseAfter(chunk.type)) {
      await sleep(getPauseDuration('heading'));
    } else {
      await sleep(getPauseDuration('paragraph'));
    }

    // 次のチャンクがあれば自動的に再生
    if (currentIndex + 1 < chunks.length) {
      playFromIndexRef.current(currentIndex + 1);
    } else {
      // 最後のチャンク終了時も URL を解放
      if (currentAudioUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      }
      setIsPlaying(false);
      setCurrentIndex(-1);

      // 記事の再生が終了したときにSupabaseインデックスを更新
      if (articleUrl && voiceModel) {
        fetch('/api/cache/update-completed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleUrl,
            voice: voiceModel,
            completed: true
          })
        }).catch((err) => {
          logger.error('[Cache Update] Failed to update completed playback:', err);
        });


      }

      // 記事の再生が終了したときのコールバック
      onArticleEndRef.current?.();
    }
  }, [chunks, setIsPlaying, setCurrentIndex, articleUrl, voiceModel]);


  // 先読み処理（クリーンアップ済みテキストを使用）
  const prefetchAudio = useCallback(
    async (startIndex: number) => {
      const endIndex = Math.min(startIndex + PREFETCH_AHEAD, chunks.length);
      const textsToFetch = chunks
        .slice(startIndex, endIndex)
        .map((chunk) => chunk.cleanedText);

      if (textsToFetch.length > 0) {
        await audioCache.prefetch(textsToFetch, voiceModel, articleUrl);
      }
    },
    [chunks, voiceModel, articleUrl]
  );



  // 特定のインデックスから再生
  const playFromIndex = useCallback(
    async (index: number) => {
      if (index < 0 || index >= chunks.length) {
        logger.warn("無効なチャンクインデックス", {
          index,
          chunksLength: chunks.length,
        });
        return;
      }

      // 既に再生処理が進行中の場合は新しいリクエストを無視
      // フラグのチェックと設定を即座に行うことで競合状態を最小化
      if (isPlayingRequestInProgressRef.current) {
        logger.warn("再生リクエストが既に進行中のため、新しいリクエストをスキップします", {
          index,
        });
        return;
      }
      isPlayingRequestInProgressRef.current = true;

      setIsLoading(true);
      setError("");

      // 既存のオーディオをクリーンアップ
      if (audioRef.current) {
        if (currentAudioUrlRef.current?.startsWith("blob:")) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
        }
        audioRef.current.pause();
      }

      try {
        // --- まず非同期処理で音声データを取得 ---
        const chunk = chunks[index];
        logger.info(
          `▶️ 再生開始: チャンク ${index + 1}/${chunks.length} (${chunk.type})`
        );

        if (needsPauseBefore(chunk.type)) {
          await sleep(getPauseDuration("heading"));
        }

        let audioUrl: string;
        if (articleUrl) {
          logger.info(`💾 IndexedDB: チャンク ${index + 1} をチェック中`);
          const cachedChunk = await getAudioChunk(
            articleUrl,
            index,
            voiceModel
          );
          if (cachedChunk) {
            logger.info(`✅ IndexedDB: キャッシュヒット チャンク ${index + 1}`);
            audioUrl = URL.createObjectURL(cachedChunk.audioData);
          } else {
            logger.info(`❌ IndexedDB: キャッシュミス チャンク ${index + 1}。バックエンドAPIを呼び出します。`, {
              articleUrl: articleUrl ?? null,
              chunkIndex: index,
            });
            audioUrl = await audioCache.get(
              chunk.cleanedText,
              voiceModel,
              articleUrl
            );
          }
        } else {
          logger.info(
            "🌐 articleUrl が未設定のため、IndexedDBをスキップしてバックエンドAPIを呼び出します。",
            {
              chunkIndex: index,
            }
          );
          audioUrl = await audioCache.get(chunk.cleanedText, voiceModel);
        }

        // 先読み
        prefetchAudio(index + 1);

        // Audio要素を作成し、音声データをセット
        const audio = new Audio();
        audioRef.current = audio;
        audio.src = audioUrl;
        currentAudioUrlRef.current = audioUrl;

        // 再生速度を設定
        const rate = parseFloat(
          localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY) || ""
        );
        audio.playbackRate = isNaN(rate) ? DEFAULT_PLAYBACK_RATE : rate;

        // play()を一度だけ呼び出す
        await audio.play();
        setIsPlaying(true); // 再生状態を更新

        // イベントハンドラを設定
        audio.onended = () => handleAudioEnded(index);
        audio.onerror = async (e) => {
          const mediaError = audio.error;

          if (mediaError?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
            logger.warn("⚠️ Audio 404 detected (LRU deletion), skipping to the next chunk.", {
              chunkIndex: index,
              text: chunk.cleanedText.substring(0, 50),
              errorCode: mediaError.code,
              errorMessage: mediaError.message,
              audioUrl: audioUrl.substring(0, 50),
            });

            // Supabaseインデックスから削除（非同期で実行、エラーは無視）
            if (articleUrl && voiceModel) {
              fetch("/api/cache/remove", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  articleUrl,
                  voice: voiceModel,
                  text: chunk.cleanedText,
                  index,
                }),
              }).catch((fetchErr) => {
                logger.error(
                  "[Cache Remove] Failed to remove from Supabase index:",
                  fetchErr
                );
              });
            }

            setError("一部の音声が再生できませんでした。次の部分から再開します。");
            // 次のチャンクへ進む
            handleAudioEnded(index);
            return;
          }

          // その他のエラー
          const errorMessage = `音声の再生に失敗しました (URL: ${audioUrl}, Code: ${mediaError?.code})`;
          logger.error("音声再生エラー", {
            error: mediaError,
            event: e,
            audioUrl,
            chunkIndex: index,
            audioUrlType: audioUrl.startsWith("blob:") ? "blob" : "other",
          });
          setError(errorMessage);
          setIsPlaying(false);
        };

        setCurrentIndex(index);
        onChunkChange?.(chunk.id);
      } catch (err) {
        const error = err as Error;

        // AbortErrorは通常の操作で発生する可能性があるため、警告レベルで記録
        // (例: ユーザーが素早くクリック、ページ遷移、コンポーネントのアンマウント等)
        // これらはエラーではなく通常の動作なので、ユーザーにエラーを表示しない
        if (error.name === "AbortError") {
          logger.warn("再生が中断されました", {
            errorName: error.name,
            errorMessage: error.message,
            chunkIndex: index,
          });
          setError("");
        } else if (error.name === "NotAllowedError") {
          setError(
            "音声の再生がブラウザにブロックされました。ページをクリックしてから再度お試しください。"
          );
          logger.error("再生処理全体でエラー (NotAllowedError)", err);
        } else {
          setError(
            err instanceof Error ? err.message : "不明なエラーが発生しました"
          );
          logger.error("再生処理全体でエラー", err);
        }
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
        isPlayingRequestInProgressRef.current = false;
      }
    },
    [chunks, articleUrl, voiceModel, onChunkChange, prefetchAudio, handleAudioEnded]
  );

  useEffect(() => {
    playFromIndexRef.current = playFromIndex;
  }, [playFromIndex]);

  // 再生開始
  const play = useCallback(() => {
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    playFromIndex(startIndex);
  }, [currentIndex, playFromIndex]);

  // 一時停止
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // 停止
  const stop = useCallback(() => {
    if (audioRef.current) {
      if (currentAudioUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      }
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentIndex(-1);
  }, []);

  // 特定のチャンクから再生（Seek機能）
  const seekToChunk = useCallback(
    (chunkId: string) => {
      const index = chunks.findIndex((chunk) => chunk.id === chunkId);
      if (index >= 0) {
        playFromIndex(index);
      }
    },
    [chunks, playFromIndex]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (currentAudioUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      }
    };
  }, []);

  return {
    isPlaying,
    isLoading,
    error,
    currentChunkId,
    currentIndex,
    play,
    pause,
    stop,
    seekToChunk,
    playbackRate,
    setPlaybackRate: updatePlaybackRate,
  };
}
