"use client";

import { useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";

/**
 * Media Session API の設定オプション
 */
interface MediaSessionOptions {
  /** 記事タイトル */
  title: string;
  /** 記事著者またはサイト名 */
  artist?: string;
  /** アルバム名（通常はアプリ名） */
  album?: string;
  /** アートワーク画像のURL配列 */
  artwork?: MediaImage[];
  /** 再生中かどうか */
  isPlaying: boolean;
  /** 再生ハンドラ */
  onPlay?: () => void;
  /** 一時停止ハンドラ */
  onPause?: () => void;
  /** 次のチャンクへ移動するハンドラ */
  onNextTrack?: () => void;
  /** 前のチャンクへ移動するハンドラ */
  onPreviousTrack?: () => void;
  /** 停止ハンドラ */
  onStop?: () => void;
}

/**
 * Media Session API を使用してバックグラウンド再生をサポートするフック
 * 
 * このフックは以下の機能を提供します:
 * - ロック画面やシステムのメディアコントロールでのメタデータ表示
 * - メディアキー（再生/一時停止/次/前）のハンドリング
 * - バックグラウンドでの音声再生継続のサポート
 */
export function useMediaSession({
  title,
  artist,
  album = "Audicle",
  artwork,
  isPlaying,
  onPlay,
  onPause,
  onNextTrack,
  onPreviousTrack,
  onStop,
}: MediaSessionOptions) {
  // コールバック関数の参照を保持（再レンダリングによる再登録を防ぐ）
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onNextTrackRef = useRef(onNextTrack);
  const onPreviousTrackRef = useRef(onPreviousTrack);
  const onStopRef = useRef(onStop);

  // Refを更新
  useEffect(() => {
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
    onNextTrackRef.current = onNextTrack;
    onPreviousTrackRef.current = onPreviousTrack;
    onStopRef.current = onStop;
  }, [onPlay, onPause, onNextTrack, onPreviousTrack, onStop]);

  // メタデータを更新
  const updateMetadata = useCallback(() => {
    if (!("mediaSession" in navigator)) {
      logger.warn("Media Session API is not supported in this browser");
      return;
    }

    // デフォルトのアートワーク
    const defaultArtwork: MediaImage[] = [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ];

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || "記事を読み上げ中",
        artist: artist || "Audicle",
        album,
        artwork: artwork || defaultArtwork,
      });
      logger.info("Media Session metadata updated", { title, artist });
    } catch (error) {
      logger.error("Failed to update Media Session metadata", error);
    }
  }, [title, artist, album, artwork]);

  // 再生状態を更新
  const updatePlaybackState = useCallback((playing: boolean) => {
    if (!("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    } catch (error) {
      logger.error("Failed to update Media Session playback state", error);
    }
  }, []);

  // アクションハンドラを登録
  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      logger.info("Media Session API is not available, skipping setup");
      return;
    }

    logger.info("Setting up Media Session action handlers");

    // 再生アクション
    const playHandler = () => {
      logger.info("Media Session: play action triggered");
      onPlayRef.current?.();
    };

    // 一時停止アクション
    const pauseHandler = () => {
      logger.info("Media Session: pause action triggered");
      onPauseRef.current?.();
    };

    // 次のトラックアクション
    const nextTrackHandler = () => {
      logger.info("Media Session: nexttrack action triggered");
      onNextTrackRef.current?.();
    };

    // 前のトラックアクション
    const previousTrackHandler = () => {
      logger.info("Media Session: previoustrack action triggered");
      onPreviousTrackRef.current?.();
    };

    // 停止アクション
    const stopHandler = () => {
      logger.info("Media Session: stop action triggered");
      onStopRef.current?.();
    };

    // アクションハンドラを登録
    try {
      navigator.mediaSession.setActionHandler("play", playHandler);
      navigator.mediaSession.setActionHandler("pause", pauseHandler);
      navigator.mediaSession.setActionHandler("nexttrack", nextTrackHandler);
      navigator.mediaSession.setActionHandler("previoustrack", previousTrackHandler);
      navigator.mediaSession.setActionHandler("stop", stopHandler);
    } catch (error) {
      logger.error("Failed to set Media Session action handlers", error);
    }

    // クリーンアップ時にハンドラを解除
    return () => {
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("stop", null);
      } catch (error) {
        logger.error("Failed to clear Media Session action handlers", error);
      }
    };
  }, []);

  // タイトルやアーティストが変わったらメタデータを更新
  // 初期マウント時もデフォルト値で設定されるようにする
  useEffect(() => {
    updateMetadata();
  }, [title, artist, album, artwork, updateMetadata]);

  // 再生状態が変わったら更新
  useEffect(() => {
    updatePlaybackState(isPlaying);
  }, [isPlaying, updatePlaybackState]);

  return {
    updateMetadata,
    updatePlaybackState,
  };
}
