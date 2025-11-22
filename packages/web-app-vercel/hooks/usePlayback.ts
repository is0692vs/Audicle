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
      const saved = localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY);
      return saved ? parseFloat(saved) : DEFAULT_PLAYBACK_RATE;
    }
    return DEFAULT_PLAYBACK_RATE;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const onArticleEndRef = useRef<(() => void) | undefined>(onArticleEnd);

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
    localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, playbackRate.toString());
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
    localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, rate.toString());
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  // オーディオオブジェクトを作成して再生するヘルパー関数
  const createAndPlayAudio = useCallback(async (audioUrl: string, audioIndex: number) => {
    // 前のAudioをクリーンアップ
    if (audioRef.current) {
      if (currentAudioUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      }
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    currentAudioUrlRef.current = audioUrl;

    // playbackRateを復元
    const rate = parseFloat(localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY) || '');
    audio.playbackRate = isNaN(rate) ? DEFAULT_PLAYBACK_RATE : rate;

    audio.onended = () => handleAudioEnded(audioIndex);

    audio.onerror = () => {
      const mediaError = audio.error;
      const errorMessage = `音声の再生に失敗しました (URL: ${audioUrl}, Code: ${mediaError?.code})`;
      logger.error("音声再生エラー", {
        error: mediaError,
        audioUrl,
        chunkIndex: audioIndex,
        audioUrlType: audioUrl.startsWith('blob:') ? 'blob' : 'other',
      });
      setError(errorMessage);
      setIsPlaying(false);
    };

    await audio.play();
    setCurrentIndex(audioIndex);
    setIsPlaying(true);
    setIsLoading(false);
    const chunk = chunks[audioIndex];
    onChunkChange?.(chunk.id);
  }, [chunks, onChunkChange]);

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

      setIsLoading(true);
      setError("");

      // 既存のオーディオをクリーンアップ
      if (audioRef.current) {
        if (currentAudioUrlRef.current?.startsWith("blob:")) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
        }
        audioRef.current.pause();
      }

      // Audio要素を即座に作成し、再生を開始してブラウザの自動再生ポリシーをクリア
      const audio = new Audio();
      audioRef.current = audio;
      currentAudioUrlRef.current = ""; // URLはまだない

      // 再生速度を設定
      const rate = parseFloat(
        localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY) || ""
      );
      audio.playbackRate = isNaN(rate) ? DEFAULT_PLAYBACK_RATE : rate;

      // play()を即座に呼び出す
      const playPromise = audio.play();

      try {
        // play()のPromiseを待つ。ここでユーザーの許可が得られる。
        await playPromise;
        setIsPlaying(true); // 再生状態を更新

        // --- ここから非同期処理 ---
        const chunk = chunks[index];
        logger.info(
          `▶️ 再生開始: チャンク ${index + 1}/${chunks.length} (${chunk.type})`
        );

        if (needsPauseBefore(chunk.type)) {
          await sleep(getPauseDuration("heading"));
        }

        let audioUrl: string;
        if (articleUrl) {
          const cachedChunk = await getAudioChunk(
            articleUrl,
            index,
            voiceModel
          );
          if (cachedChunk) {
            logger.info(`💾 キャッシュヒット: チャンク ${index + 1}`);
            audioUrl = URL.createObjectURL(cachedChunk.audioData);
          } else {
            logger.info(`🌐 キャッシュミス: API呼び出し`, {
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
            "🌐 キャッシュミス: articleUrlが未設定のためテキストのみでAPI呼び出し",
            {
              chunkIndex: index,
            }
          );
          audioUrl = await audioCache.get(chunk.cleanedText, voiceModel);
        }

        // 先読み
        prefetchAudio(index + 1);

        // 取得したURLをセット
        audio.src = audioUrl;
        currentAudioUrlRef.current = audioUrl;

        // イベントハンドラを設定
        audio.onended = () => handleAudioEnded(index);
        audio.onerror = async (e) => {
          const mediaError = audio.error;
          if (
            mediaError?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
          ) {
            logger.warn(
              "⚠️ Audio 404 detected (LRU deletion), regenerating...",
              {
                chunk: index,
                text: chunk.cleanedText.substring(0, 50),
                errorCode: mediaError.code,
                errorMessage: mediaError.message,
              }
            );
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
              }).catch((err) => {
                logger.error(
                  "[Cache Remove] Failed to remove from Supabase index:",
                  err
                );
              });
            }
            if (chunk && articleUrl) {
              try {
                const newUrl = await audioCache.get(
                  chunk.cleanedText,
                  voiceModel,
                  articleUrl,
                  true
                );
                logger.info("✅ Audio regenerated successfully");
                await createAndPlayAudio(newUrl, index);
                return;
              } catch (err) {
                logger.error("❌ Audio regeneration failed", err);
                setError("音声の再生成に失敗しました");
                setIsPlaying(false);
                setIsLoading(false);
                return;
              }
            }
          }
          const errorMessage = `音声の再生に失敗しました (URL: ${audioUrl}, Code: ${mediaError?.code})`;
          logger.error("音声再生エラー", { error: mediaError, event: e });
          setError(errorMessage);

          setIsPlaying(false);
        };

        setCurrentIndex(index);
        onChunkChange?.(chunk.id);
      } catch (err) {
        if ((err as Error).name === "NotAllowedError") {
          setError(
            "音声の再生がブラウザにブロックされました。ページをクリックしてから再度お試しください。"
          );
        } else {
          setError(
            err instanceof Error ? err.message : "不明なエラーが発生しました"
          );
        }
        logger.error("再生処理全体でエラー", err);
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    },
    [chunks, articleUrl, voiceModel, onChunkChange, prefetchAudio]
  );

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
      playFromIndex(currentIndex + 1);
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
  }, [chunks, setIsPlaying, setCurrentIndex, playFromIndex, articleUrl, voiceModel]);

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
