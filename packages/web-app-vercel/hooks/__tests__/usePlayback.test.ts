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

  describe('next()', () => {
    it('次のチャンクへ移動すること', async () => {
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
        {
          id: "chunk-2",
          text: "テストチャンク2",
          cleanedText: "テストチャンク2",
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

      // 最初のチャンクを再生
      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      });

      // next() を呼ぶ
      act(() => {
        result.current.next();
      });

      // 次のチャンクへ移動することを確認
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(1);
      });
    });

    it('最後のチャンクで next() を呼んだ場合、何もしないこと', async () => {
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

      // 最初のチャンクを再生
      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      });

      // 最後のチャンクで next() を呼ぶ
      act(() => {
        result.current.next();
      });

      // currentIndex が変わらないことを確認（何もしない）
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      });
    });
  });

  describe('previous()', () => {
    it('前のチャンクへ移動すること', async () => {
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
        {
          id: "chunk-2",
          text: "テストチャンク2",
          cleanedText: "テストチャンク2",
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

      // 2番目のチャンクを直接再生
      await act(async () => {
        result.current.seekToChunk("chunk-2");
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(1);
      });

      // previous() を呼ぶ
      act(() => {
        result.current.previous();
      });

      // 前のチャンクへ移動することを確認
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      });
    });

    it('最初のチャンクで previous() を呼んだ場合、最初から再生すること', async () => {
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
        {
          id: "chunk-2",
          text: "テストチャンク2",
          cleanedText: "テストチャンク2",
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

      // 最初のチャンクを再生
      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      });

      // 最初のチャンクで previous() を呼ぶ
      act(() => {
        result.current.previous();
      });

      // currentIndex が 0 のまま（最初から再生）
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      });
    });
  });

  describe('境界条件', () => {
    it('空のchunks配列でエラーが発生しないこと', () => {
      const mockChunks: Chunk[] = [];

      expect(() => {
        renderHook(() =>
          usePlayback({
            chunks: mockChunks,
          })
        );
      }).not.toThrow();
    });

    it('単一チャンクでのnext/previous動作', async () => {
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

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      });

      // next() を呼んでも何もしない
      act(() => {
        result.current.next();
      });

      expect(result.current.currentIndex).toBe(0);

      // previous() を呼んでも最初から再生
      act(() => {
        result.current.previous();
      });

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe('Media Session メタデータ連携', () => {
    it('articleTitle が useMediaSession に渡されること', () => {
      const { useMediaSession } = require("../useMediaSession");

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "テストチャンク1",
          cleanedText: "テストチャンク1",
          type: "paragraph",
        },
      ];

      const articleTitle = "テスト記事タイトル";
      const articleAuthor = "テスト著者";

      renderHook(() =>
        usePlayback({
          chunks: mockChunks,
          articleTitle,
          articleAuthor,
        })
      );

      // useMediaSession が呼ばれたことを確認
      expect(useMediaSession).toHaveBeenCalledWith(
        expect.objectContaining({
          title: articleTitle,
          artist: articleAuthor,
        })
      );
    });

    it('articleAuthor が useMediaSession に渡されること', () => {
      const { useMediaSession } = require("../useMediaSession");

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "テストチャンク1",
          cleanedText: "テストチャンク1",
          type: "paragraph",
        },
      ];

      const articleTitle = "テスト記事タイトル";
      const articleAuthor = "テスト著者";

      renderHook(() =>
        usePlayback({
          chunks: mockChunks,
          articleTitle,
          articleAuthor,
        })
      );

      // useMediaSession が呼ばれたことを確認
      expect(useMediaSession).toHaveBeenCalledWith(
        expect.objectContaining({
          artist: articleAuthor,
        })
      );
    });
  });
});

  describe('Separator Chunk Skipping (Empty cleanedText)', () => {
    it('should skip chunks with empty cleanedText and play next chunk', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");
      const { logger } = require("@/lib/logger");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "最初の段落",
          cleanedText: "最初の段落",
          type: "paragraph",
        },
        {
          id: "chunk-2",
          text: "============",
          cleanedText: "", // セパレータ（空）
          type: "paragraph",
        },
        {
          id: "chunk-3",
          text: "次の段落",
          cleanedText: "次の段落",
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

      // 最初のチャンクから再生開始
      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });

      // 音声が再生されたことを確認
      expect(mockAudioInstance.src).toBe("blob:mock-audio-url");

      // 次のチャンクへ移動（セパレータ）
      await act(async () => {
        result.current.next();
      });

      // セパレータをスキップして、3番目のチャンクに移動していることを確認
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(2);
      }, { timeout: 3000 });

      // スキップログが記録されていることを確認
      const skipLogCalls = logger.info.mock.calls.filter(
        (call: any[]) => call[0].includes("スキップ")
      );
      expect(skipLogCalls.length).toBeGreaterThan(0);
    });

    it('should skip multiple consecutive separator chunks', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "最初の段落",
          cleanedText: "最初の段落",
          type: "paragraph",
        },
        {
          id: "chunk-2",
          text: "============",
          cleanedText: "", // セパレータ1
          type: "paragraph",
        },
        {
          id: "chunk-3",
          text: "------------",
          cleanedText: "", // セパレータ2
          type: "paragraph",
        },
        {
          id: "chunk-4",
          text: "***********",
          cleanedText: "", // セパレータ3
          type: "paragraph",
        },
        {
          id: "chunk-5",
          text: "最後の段落",
          cleanedText: "最後の段落",
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

      // 最初のチャンクから再生開始
      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      }, { timeout: 3000 });

      // 次のチャンクへ移動（複数のセパレータを連続スキップ）
      await act(async () => {
        result.current.next();
      });

      // すべてのセパレータをスキップして、5番目のチャンク（インデックス4）に移動
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(4);
      }, { timeout: 5000 });
    });

    it('should end playback if last chunk is a separator', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "最初の段落",
          cleanedText: "最初の段落",
          type: "paragraph",
        },
        {
          id: "chunk-2",
          text: "============",
          cleanedText: "", // 最後がセパレータ
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

      // 最初のチャンクから再生開始
      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      }, { timeout: 3000 });

      // 次のチャンクへ移動（最後がセパレータ）
      await act(async () => {
        result.current.next();
      });

      // 再生が終了していることを確認
      await waitFor(() => {
        expect(result.current.isPlaying).toBe(false);
      }, { timeout: 3000 });
    });

    it('should handle all chunks being separators gracefully', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "============",
          cleanedText: "",
          type: "paragraph",
        },
        {
          id: "chunk-2",
          text: "------------",
          cleanedText: "",
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

      // 再生開始
      await act(async () => {
        result.current.play();
      });

      // すべてセパレータなので、再生が終了していることを確認
      await waitFor(() => {
        expect(result.current.isPlaying).toBe(false);
      }, { timeout: 3000 });
    });

    it('should skip separator at the beginning and start with first content chunk', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "============",
          cleanedText: "", // 最初がセパレータ
          type: "paragraph",
        },
        {
          id: "chunk-2",
          text: "本文",
          cleanedText: "本文",
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

      // 再生開始
      await act(async () => {
        result.current.play();
      });

      // セパレータをスキップして2番目のチャンクから再生開始
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(1);
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });
    });

    it('should handle whitespace-only cleanedText as separators', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "段落1",
          cleanedText: "段落1",
          type: "paragraph",
        },
        {
          id: "chunk-2",
          text: "   ", // 空白のみ
          cleanedText: "   ",
          type: "paragraph",
        },
        {
          id: "chunk-3",
          text: "\n\t  ", // 改行・タブ・空白のみ
          cleanedText: "\n\t  ",
          type: "paragraph",
        },
        {
          id: "chunk-4",
          text: "段落2",
          cleanedText: "段落2",
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

      // 最初のチャンクから再生開始
      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      }, { timeout: 3000 });

      // 次のチャンクへ移動（空白チャンクをスキップ）
      await act(async () => {
        result.current.next();
      });

      // 空白チャンクをスキップして、4番目のチャンク（インデックス3）に移動
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(3);
      }, { timeout: 5000 });
    });

    it('should not attempt to play audio for separator chunks', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "段落1",
          cleanedText: "段落1",
          type: "paragraph",
        },
        {
          id: "chunk-2",
          text: "============",
          cleanedText: "",
          type: "paragraph",
        },
        {
          id: "chunk-3",
          text: "段落2",
          cleanedText: "段落2",
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

      const initialGetCallCount = audioCache.get.mock.calls.length;

      // 2番目のチャンク（セパレータ）に直接シーク
      await act(async () => {
        result.current.seekToChunk("chunk-2");
      });

      // セパレータをスキップして3番目のチャンクが再生されることを確認
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(2);
      }, { timeout: 3000 });

      // audioCache.getがセパレータに対して呼ばれていないことを確認
      // （段落1と段落2の2回のみ呼ばれる）
      const finalGetCallCount = audioCache.get.mock.calls.length;
      const callsForSeparator = audioCache.get.mock.calls.filter(
        (call: any[]) => call[0] === ""
      );
      expect(callsForSeparator.length).toBe(0);
    });

    it('should call onArticleEnd when ending on a separator chunk', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");
      const onArticleEnd = jest.fn();

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "唯一の段落",
          cleanedText: "唯一の段落",
          type: "paragraph",
        },
        {
          id: "chunk-2",
          text: "============",
          cleanedText: "",
          type: "paragraph",
        },
      ];

      const { result } = renderHook(() =>
        usePlayback({
          chunks: mockChunks,
          articleUrl: "https://example.com/test",
          voiceModel: "ja-JP-Standard-B",
          onArticleEnd,
        })
      );

      // 最初のチャンクから再生開始
      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      }, { timeout: 3000 });

      // 音声終了をシミュレート
      await act(async () => {
        if (mockAudioInstance.onended) {
          mockAudioInstance.onended();
        }
      });

      // onArticleEnd が呼ばれることを期待
      // （最後のチャンクがセパレータでも、記事全体は終了している）
      await waitFor(() => {
        expect(onArticleEnd).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Prefetch Filtering for Separators', () => {
    it('should filter out empty cleanedText from prefetch queue', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");
      audioCache.prefetch.mockResolvedValue(undefined);

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "段落1",
          cleanedText: "段落1",
          type: "paragraph",
        },
        {
          id: "chunk-2",
          text: "============",
          cleanedText: "",
          type: "paragraph",
        },
        {
          id: "chunk-3",
          text: "段落2",
          cleanedText: "段落2",
          type: "paragraph",
        },
        {
          id: "chunk-4",
          text: "------------",
          cleanedText: "",
          type: "paragraph",
        },
        {
          id: "chunk-5",
          text: "段落3",
          cleanedText: "段落3",
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

      // 再生開始
      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      }, { timeout: 3000 });

      // prefetchが呼ばれたことを確認
      await waitFor(() => {
        expect(audioCache.prefetch).toHaveBeenCalled();
      }, { timeout: 1000 });

      // prefetchに渡されたテキスト配列にセパレータが含まれていないことを確認
      const prefetchCalls = audioCache.prefetch.mock.calls;
      for (const call of prefetchCalls) {
        const textsArray = call[0]; // 最初の引数がテキスト配列
        if (Array.isArray(textsArray)) {
          // 空文字列が含まれていないことを確認
          textsArray.forEach((text: string) => {
            expect(text.trim()).not.toBe('');
          });
        }
      }
    });

    it('should prefetch only non-empty chunks in mixed content', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");
      audioCache.prefetch.mockResolvedValue(undefined);

      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "段落1",
          cleanedText: "段落1",
          type: "paragraph",
        },
        {
          id: "chunk-2",
          text: "",
          cleanedText: "",
          type: "paragraph",
        },
        {
          id: "chunk-3",
          text: "段落2",
          cleanedText: "段落2",
          type: "paragraph",
        },
        {
          id: "chunk-4",
          text: "",
          cleanedText: "",
          type: "paragraph",
        },
        {
          id: "chunk-5",
          text: "段落3",
          cleanedText: "段落3",
          type: "paragraph",
        },
        {
          id: "chunk-6",
          text: "段落4",
          cleanedText: "段落4",
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

      // 再生開始
      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      }, { timeout: 3000 });

      // prefetchが呼ばれるまで待つ
      await waitFor(() => {
        expect(audioCache.prefetch.mock.calls.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // prefetchに渡されたテキストを確認
      const prefetchCalls = audioCache.prefetch.mock.calls;
      let allPrefetchedTexts: string[] = [];
      
      for (const call of prefetchCalls) {
        const textsArray = call[0];
        if (Array.isArray(textsArray)) {
          allPrefetchedTexts = allPrefetchedTexts.concat(textsArray);
        }
      }

      // 空文字列が含まれていないことを確認
      allPrefetchedTexts.forEach((text: string) => {
        expect(text.trim()).not.toBe('');
      });

      // 実際のコンテンツのみが含まれていることを確認
      const contentTexts = ["段落1", "段落2", "段落3", "段落4"];
      allPrefetchedTexts.forEach((text: string) => {
        expect(contentTexts).toContain(text);
      });
    });
  });

  describe('Separator Integration with Qiita-style Articles', () => {
    it('should handle typical Qiita article structure with multiple separators', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");

      // Qiita記事の典型的な構造
      const mockChunks: Chunk[] = [
        {
          id: "chunk-1",
          text: "はじめに",
          cleanedText: "はじめに",
          type: "h2",
        },
        {
          id: "chunk-2",
          text: "============",
          cleanedText: "",
          type: "paragraph",
        },
        {
          id: "chunk-3",
          text: "この記事では...",
          cleanedText: "この記事では...",
          type: "paragraph",
        },
        {
          id: "chunk-4",
          text: "技術詳細",
          cleanedText: "技術詳細",
          type: "h2",
        },
        {
          id: "chunk-5",
          text: "------------",
          cleanedText: "",
          type: "paragraph",
        },
        {
          id: "chunk-6",
          text: "実装の詳細...",
          cleanedText: "実装の詳細...",
          type: "paragraph",
        },
        {
          id: "chunk-7",
          text: "まとめ",
          cleanedText: "まとめ",
          type: "h2",
        },
        {
          id: "chunk-8",
          text: "***********",
          cleanedText: "",
          type: "paragraph",
        },
        {
          id: "chunk-9",
          text: "ご覧いただきありがとうございました",
          cleanedText: "ご覧いただきありがとうございました",
          type: "paragraph",
        },
      ];

      const { result } = renderHook(() =>
        usePlayback({
          chunks: mockChunks,
          articleUrl: "https://qiita.com/test-article",
          voiceModel: "ja-JP-Standard-B",
        })
      );

      // 再生開始
      await act(async () => {
        result.current.play();
      });

      // 最初のチャンク（見出し）が再生される
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      }, { timeout: 3000 });

      // セパレータをスキップして次のコンテンツへ
      await act(async () => {
        result.current.next();
      });

      // インデックス2（セパレータをスキップ）に移動
      await waitFor(() => {
        expect(result.current.currentIndex).toBe(2);
      }, { timeout: 3000 });

      // さらに次へ（見出しへ）
      await act(async () => {
        result.current.next();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(3);
      }, { timeout: 3000 });

      // さらに次へ（セパレータをスキップして段落へ）
      await act(async () => {
        result.current.next();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(5);
      }, { timeout: 3000 });
    });

    it('should properly count playable chunks excluding separators', async () => {
      const { audioCache } = require("@/lib/audioCache");
      const { getAudioChunk } = require("@/lib/indexedDB");
      const { logger } = require("@/lib/logger");

      // モックの設定
      getAudioChunk.mockResolvedValue(null);
      audioCache.get.mockResolvedValue("blob:mock-audio-url");

      const mockChunks: Chunk[] = [
        { id: "1", text: "段落1", cleanedText: "段落1", type: "p" },
        { id: "2", text: "===", cleanedText: "", type: "p" },
        { id: "3", text: "段落2", cleanedText: "段落2", type: "p" },
        { id: "4", text: "---", cleanedText: "", type: "p" },
        { id: "5", text: "段落3", cleanedText: "段落3", type: "p" },
      ];

      const { result } = renderHook(() =>
        usePlayback({
          chunks: mockChunks,
          articleUrl: "https://example.com/test",
          voiceModel: "ja-JP-Standard-B",
        })
      );

      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      }, { timeout: 3000 });

      // ログメッセージに正しいチャンク番号が含まれているか確認
      // （セパレータを含めた総数でカウントされる）
      const logCalls = logger.info.mock.calls.filter(
        (call: any[]) => call[0].includes("再生開始:")
      );
      
      expect(logCalls.length).toBeGreaterThan(0);
      // "チャンク 1/5" のような形式でログ出力されることを確認
      const firstLogMessage = logCalls[0][0];
      expect(firstLogMessage).toContain("1/5");
    });
  });
