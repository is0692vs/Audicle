"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Chunk } from "@/types/api";
import { audioCache } from "@/lib/audioCache";
import { getAudioChunk } from "@/lib/indexedDB";
import { synthesizeSpeech } from "@/lib/api";
import { logger } from "@/lib/logger";
import { needsPauseBefore, needsPauseAfter, getPauseDuration } from "@/lib/paragraphParser";

interface UsePlaybackProps {
  chunks: Chunk[];
  articleUrl?: string;
  voice?: string;
  speed?: number;
  voiceModel?: string;       // 音声モデル（例: 'ja-JP-Standard-B'）
  playbackSpeed?: number;    // 再生速度（例: 1.0, 1.5, 2.0）
  onChunkChange?: (chunkId: string) => void;
}

const PREFETCH_AHEAD = 3; // 3つ先まで先読み

/**
 * 指定時間待機する
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function usePlayback({ chunks, articleUrl, voiceModel, playbackSpeed, onChunkChange }: UsePlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("audicle-playback-rate");
      return saved ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);

  // 現在のチャンクID
  const currentChunkId =
    currentIndex >= 0 && currentIndex < chunks.length
      ? chunks[currentIndex].id
      : undefined;

  // playbackRateの変更をlocalStorageに保存
  useEffect(() => {
    localStorage.setItem("audicle-playback-rate", playbackRate.toString());
  }, [playbackRate]);

  // playbackRateを設定する関数
  const updatePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  // 先読み処理（クリーンアップ済みテキストを使用）
  const prefetchAudio = useCallback(
    async (startIndex: number) => {
      const endIndex = Math.min(startIndex + PREFETCH_AHEAD, chunks.length);
      const textsToFetch = chunks
        .slice(startIndex, endIndex)
        .map((chunk) => chunk.cleanedText);

      if (textsToFetch.length > 0) {
        await audioCache.prefetch(textsToFetch, voiceModel, playbackSpeed);
      }
    },
    [chunks, voiceModel, playbackSpeed]
  );

  // 特定のインデックスから再生
  const playFromIndex = useCallback(
    async (index: number) => {
      if (index < 0 || index >= chunks.length) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const chunk = chunks[index];

        logger.info(`▶️ 再生開始: チャンク ${index + 1}/${chunks.length} (${chunk.type})`);

        // 見出しの前にポーズ
        if (needsPauseBefore(chunk.type)) {
          await sleep(getPauseDuration('heading'));
        }

        // 1. IndexedDBからキャッシュをチェック
        let audioUrl: string;
        if (articleUrl) {
          const cachedChunk = await getAudioChunk(articleUrl, index, voiceModel, playbackSpeed);

          if (cachedChunk) {
            // キャッシュヒット: Blobから直接URLを生成
            logger.info(`💾 キャッシュヒット: チャンク ${index + 1}`);
            audioUrl = URL.createObjectURL(cachedChunk.audioData);
          } else {
            // キャッシュミス: API呼び出し
            logger.info(`🌐 キャッシュミス: API呼び出し`);
            audioUrl = await audioCache.get(chunk.cleanedText, voiceModel, playbackSpeed);
          }
        } else {
          // articleURLがない場合は既存の動作
          audioUrl = await audioCache.get(chunk.cleanedText, voiceModel, playbackSpeed);
        }

        // 先読み処理（非同期で実行）
        prefetchAudio(index + 1);

        // Audio要素を作成して再生
        if (audioRef.current) {
          // 前のURLを解放
          if (currentAudioUrlRef.current?.startsWith('blob:')) {
            URL.revokeObjectURL(currentAudioUrlRef.current);
          }
          audioRef.current.pause();
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        currentAudioUrlRef.current = audioUrl;
        audio.playbackRate = playbackRate;

        audio.onended = async () => {
          // 見出しの後、または段落間にポーズ
          if (needsPauseAfter(chunk.type)) {
            await sleep(getPauseDuration('heading'));
          } else {
            await sleep(getPauseDuration('paragraph'));
          }

          // 次のチャンクがあれば自動的に再生
          if (index + 1 < chunks.length) {
            playFromIndex(index + 1);
          } else {
            // 最後のチャンク終了時も URL を解放
            if (currentAudioUrlRef.current?.startsWith('blob:')) {
              URL.revokeObjectURL(currentAudioUrlRef.current);
            }
            setIsPlaying(false);
            setCurrentIndex(-1);
          }
        };

        audio.onerror = () => {
          setError("音声の再生に失敗しました");
          setIsPlaying(false);
        };

        await audio.play();
        setCurrentIndex(index);
        setIsPlaying(true);
        onChunkChange?.(chunk.id);
      } catch (err) {
        logger.error("再生エラー", err);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    },
    [chunks, articleUrl, voice, voiceModel, playbackSpeed, onChunkChange, prefetchAudio, playbackRate]
  );

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
