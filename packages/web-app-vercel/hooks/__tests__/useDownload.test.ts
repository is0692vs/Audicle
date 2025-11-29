import { renderHook, act } from '@testing-library/react';
import { useDownload } from '../useDownload';
import { synthesizeSpeech } from '@/lib/api';
import { saveAudioChunk, checkStorageCapacity } from '@/lib/indexedDB';
import { logger } from '@/lib/logger';
import { Chunk } from '@/types/api';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  synthesizeSpeech: jest.fn(),
}));

jest.mock('@/lib/indexedDB', () => ({
  saveAudioChunk: jest.fn(),
  checkStorageCapacity: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useDownload', () => {
  const mockChunks: Chunk[] = [
    { id: '1', text: 'chunk1', cleanedText: 'chunk1', type: 'paragraph' },
    { id: '2', text: 'chunk2', cleanedText: 'chunk2', type: 'paragraph' },
  ];
  const articleUrl = 'https://example.com/article';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with idle status', () => {
    const { result } = renderHook(() =>
      useDownload({ articleUrl, chunks: mockChunks })
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toEqual({ current: 0, total: 0 });
    expect(result.current.error).toBe('');
  });

  it('should start download and complete successfully', async () => {
    (checkStorageCapacity as jest.Mock).mockResolvedValue(true);
    (synthesizeSpeech as jest.Mock).mockResolvedValue(new Blob(['audio'], { type: 'audio/mp3' }));

    const { result } = renderHook(() =>
      useDownload({ articleUrl, chunks: mockChunks })
    );

    await act(async () => {
      const promise = result.current.startDownload();
      await promise;
    });

    expect(result.current.status).toBe('completed');
    expect(result.current.progress).toEqual({ current: 2, total: 2 });
    expect(synthesizeSpeech).toHaveBeenCalledTimes(2);
    expect(saveAudioChunk).toHaveBeenCalledTimes(2);
  });

  it('should handle cancellation', async () => {
    (checkStorageCapacity as jest.Mock).mockResolvedValue(true);

    // Simulate long running process
    (synthesizeSpeech as jest.Mock).mockImplementation(() =>
        new Promise(resolve => {
            setTimeout(() => resolve(new Blob(['audio'])), 5000);
        })
    );

    const { result } = renderHook(() =>
      useDownload({ articleUrl, chunks: mockChunks })
    );

    let downloadPromise: Promise<void>;
    await act(async () => {
      downloadPromise = result.current.startDownload();
    });

    // Advance time slightly
    await act(async () => {
        jest.advanceTimersByTime(100);
    });

    act(() => {
        result.current.cancelDownload();
    });

    // Advance time to allow promise to resolve
    await act(async () => {
        jest.runAllTimers();
    });

    await act(async () => {
        await downloadPromise!;
    });

    expect(result.current.status).toBe('cancelled');
  });

  it('should handle insufficient storage', async () => {
    (checkStorageCapacity as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() =>
      useDownload({ articleUrl, chunks: mockChunks })
    );

    await act(async () => {
      await result.current.startDownload();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('ストレージ容量が不足しています');
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it('should handle synthesizeSpeech errors (retries exhausted)', async () => {
    (checkStorageCapacity as jest.Mock).mockResolvedValue(true);
    (synthesizeSpeech as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() =>
      useDownload({ articleUrl, chunks: mockChunks })
    );

    let downloadPromise: Promise<void>;
    await act(async () => {
        downloadPromise = result.current.startDownload();
    });

    // Advance timers enough to cover all retries (3 retries * 1000ms + some buffer)
    for (let i = 0; i < 4; i++) {
         await act(async () => {
            jest.advanceTimersByTime(1100);
        });
    }

    await act(async () => {
        await downloadPromise!;
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('API Error');
    // 2 chunks concurrent. Both fail.
    // Each retries 3 times. 1 (initial) + 3 (retries) = 4 calls per chunk.
    // Total 8 calls.
    expect(synthesizeSpeech).toHaveBeenCalledTimes(8);
  });

  it('should retry on failure and eventually succeed', async () => {
      (checkStorageCapacity as jest.Mock).mockResolvedValue(true);
      const mockSynthesize = synthesizeSpeech as jest.Mock;

      // We expect 3 calls total.
      // Call 1 (Chunk 1): Fails
      // Call 2 (Chunk 2): Succeeds (concurrent)
      // Call 3 (Chunk 1 Retry): Succeeds

      mockSynthesize
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce(new Blob(['audio']))
        .mockResolvedValueOnce(new Blob(['audio']));

      const { result } = renderHook(() =>
        useDownload({ articleUrl, chunks: mockChunks })
      );

      let downloadPromise: Promise<void>;
      await act(async () => {
        downloadPromise = result.current.startDownload();
      });

      // Run timers to process retries
      await act(async () => {
          jest.advanceTimersByTime(1100);
      });

      await act(async () => {
          await downloadPromise!;
      });

      expect(result.current.status).toBe('completed');
      expect(mockSynthesize).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('リトライ'));
  });

  it('should handle slow connection callback', async () => {
      (checkStorageCapacity as jest.Mock).mockResolvedValue(true);

      // Mock navigator.connection
      Object.defineProperty(navigator, 'connection', {
          value: { effectiveType: '3g' },
          configurable: true,
          writable: true
      });

      const onSlowConnection = jest.fn().mockResolvedValue(false); // User cancels

      const { result } = renderHook(() =>
        useDownload({ articleUrl, chunks: mockChunks, onSlowConnection })
      );

      await act(async () => {
          await result.current.startDownload();
      });

      expect(onSlowConnection).toHaveBeenCalled();
      expect(result.current.status).toBe('cancelled');
      expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it('should handle slow connection callback confirmed', async () => {
    (checkStorageCapacity as jest.Mock).mockResolvedValue(true);
    (synthesizeSpeech as jest.Mock).mockResolvedValue(new Blob(['audio']));

    // Mock navigator.connection
    Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '3g' },
        configurable: true,
        writable: true
    });

    const onSlowConnection = jest.fn().mockResolvedValue(true); // User confirms

    const { result } = renderHook(() =>
      useDownload({ articleUrl, chunks: mockChunks, onSlowConnection })
    );

    await act(async () => {
        const promise = result.current.startDownload();
        await promise;
    });

    expect(onSlowConnection).toHaveBeenCalled();
    expect(result.current.status).toBe('completed');
    expect(synthesizeSpeech).toHaveBeenCalled();
  });
});
