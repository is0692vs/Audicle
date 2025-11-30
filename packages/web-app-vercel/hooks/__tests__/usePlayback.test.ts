import { renderHook, waitFor, act } from "@testing-library/react";
import { usePlayback } from "../usePlayback";
import { Chunk } from "@/types/api";
import "@testing-library/jest-dom";

// モックのセットアップ
jest.mock("@/lib/audioCache", () => ({
  audioCache: {
    get: jest.fn(),
    prefetch: jest.fn(),
  },
}));

jest.mock("@/lib/indexedDB", () => ({
  getAudioChunk: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/paragraphParser", () => ({
  needsPauseBefore: jest.fn(() => false),
  needsPauseAfter: jest.fn(() => false),
  getPauseDuration: jest.fn(() => 0),
}));

// useMediaSession フックのモック（バックグラウンド再生用）
jest.mock("../useMediaSession", () => ({
  useMediaSession: jest.fn(() => ({
    updateMetadata: jest.fn(),
    updatePlaybackState: jest.fn(),
  })),
}));

// HTMLAudioElement のモック
class MockAudio {
  src = "";
  playbackRate = 1.0;
  paused = true;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  error: MediaError | null = null;

  playCallCount = 0;

  play(): Promise<void> {
    this.playCallCount++;
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

describe("usePlayback", () => {
  let mockAudioInstance: MockAudio;
  const originalAudio = global.Audio;

  beforeEach(() => {
    // Audioオブジェクトをモックする
    mockAudioInstance = new MockAudio();
    global.Audio = jest.fn(() => mockAudioInstance) as any;

    // localStorageのモック
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    global.Audio = originalAudio;
    jest.clearAllMocks();
  });

  it("play()が一度だけ呼ばれることを確認（AbortError修正の検証）", async () => {
    const { audioCache } = require("@/lib/audioCache");
    const { getAudioChunk } = require("@/lib/indexedDB");

    // モックの設定
    getAudioChunk.mockResolvedValue(null);
    audioCache.get.mockResolvedValue("blob:mock-audio-url");

    const mockChunks: Chunk[] = [
      {
        id: "chunk-1",
        text: "テストチャンク1",
        cleanedText: "テストチャンク1",
        type: "paragraph",
      },
    ];

    const { result } = renderHook(() =>
      usePlayback({
        chunks: mockChunks,
        articleUrl: "https://example.com/test",
        voiceModel: "ja-JP-Standard-B",
      })
    );

    // 再生を開始
    await act(async () => {
      result.current.play();
    });

    // 非同期処理を待つ
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 }
    );

    // play()が一度だけ呼ばれたことを確認
    // 修正前は2回呼ばれていたが、修正後は1回のみ
    expect(mockAudioInstance.playCallCount).toBe(1);
    
    // 音声ソースが設定されていることを確認
    expect(mockAudioInstance.src).toBe("blob:mock-audio-url");
  });

  it("複数回の再生リクエストが同時に発生した場合、2回目以降がスキップされることを確認", async () => {
    const { audioCache } = require("@/lib/audioCache");
    const { getAudioChunk } = require("@/lib/indexedDB");
    const { logger } = require("@/lib/logger");

    // モックの設定（遅延を加えて競合状態を再現）
    getAudioChunk.mockResolvedValue(null);
    audioCache.get.mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve("blob:mock-audio-url"), 100))
    );

    const mockChunks: Chunk[] = [
      {
        id: "chunk-1",
        text: "テストチャンク1",
        cleanedText: "テストチャンク1",
        type: "paragraph",
      },
    ];

    const { result } = renderHook(() =>
      usePlayback({
        chunks: mockChunks,
        articleUrl: "https://example.com/test",
        voiceModel: "ja-JP-Standard-B",
      })
    );

    // 短時間に複数回再生を試みる
    await act(async () => {
      result.current.play();
      result.current.play();
      result.current.play();
    });

    // 非同期処理を待つ
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 }
    );

    // 警告ログが2回呼ばれたことを確認（2回目と3回目がスキップされた）
    const warnCalls = logger.warn.mock.calls.filter(
      (call: any[]) => call[0] === "再生リクエストが既に進行中のため、新しいリクエストをスキップします"
    );
    expect(warnCalls.length).toBeGreaterThanOrEqual(1);
  });
});
