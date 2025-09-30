// 音声キャッシュ管理

import { synthesizeSpeech } from "./api";
import { logger } from "./logger";

interface CacheEntry {
  blob: Blob;
  url: string;
  timestamp: number;
}

const CACHE_PREFIX = "audio_";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24時間

class AudioCache {
  private cache = new Map<string, CacheEntry>();

  // キャッシュキーを生成
  private getCacheKey(text: string): string {
    return `${CACHE_PREFIX}${this.hashString(text)}`;
  }

  // 簡単なハッシュ関数
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  // 音声を取得（キャッシュがあればそれを、なければ合成）
  async get(text: string, voice: string = "ja-JP-Wavenet-B"): Promise<string> {
    const key = this.getCacheKey(text);

    // キャッシュチェック
    const cached = this.cache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < CACHE_EXPIRY) {
        logger.cache("HIT", `${text.substring(0, 30)}...`);
        return cached.url;
      } else {
        // 期限切れのキャッシュを削除
        this.revoke(key);
      }
    }

    // キャッシュミス - 新規合成
    logger.cache("MISS", `${text.substring(0, 30)}...`);
    const blob = await synthesizeSpeech(text, voice);
    const url = URL.createObjectURL(blob);

    this.cache.set(key, {
      blob,
      url,
      timestamp: Date.now(),
    });

    logger.cache("STORE", key);
    return url;
  }

  // 複数の音声を先読み
  async prefetch(
    texts: string[],
    voice: string = "ja-JP-Wavenet-B"
  ): Promise<void> {
    logger.info(`🔄 先読み開始: ${texts.length}件`);
    
    const promises = texts.map(async (text) => {
      try {
        await this.get(text, voice);
      } catch (error) {
        logger.error(`先読みエラー: ${text.substring(0, 30)}...`, error);
      }
    });

    await Promise.all(promises);
    logger.success(`✅ 先読み完了: ${texts.length}件`);
  }

  // URL を解放
  private revoke(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      URL.revokeObjectURL(entry.url);
      this.cache.delete(key);
      logger.cache("REVOKE", key);
    }
  }

  // すべてのキャッシュをクリア
  clear(): void {
    this.cache.forEach((entry) => {
      URL.revokeObjectURL(entry.url);
    });
    this.cache.clear();
    logger.cache("CLEAR", "all");
  }
}

export const audioCache = new AudioCache();
