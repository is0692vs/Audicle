/**
 * 記事アクセス統計を記録するヘルパー関数
 */

import { Chunk } from '@/types/api';
import { logger } from './logger';

interface RecordStatsParams {
    url: string;
    title: string;
    content: string;
    chunks: Chunk[];
}

// リトライヘルパー関数
async function retryFetch(fetchFn: () => Promise<Response>, maxRetries: number = 3, delay: number = 1000): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fetchFn();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            // ECONNRESET などのネットワークエラー時はリトライ
            if (error instanceof Error && (error.message.includes('ECONNRESET') || error.message.includes('aborted'))) {
                logger.warn(`Fetch attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error; // ネットワークエラー以外は即座に投げる
            }
        }
    }
    throw new Error('Max retries exceeded');
}

/**
 * 簡易ハッシュ関数（記事識別用）
 * MD5の代わりにSHA-256を使用
 */
async function calculateHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * URLからドメインを抽出
 */
function extractDomain(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return 'unknown';
    }
}

/**
 * キャッシュヒット/ミスを計算（仮実装）
 * 実際のキャッシュ状況に応じて調整が必要
 */
async function calculateCacheStats(chunks: Chunk[]) {
    // TODO: 実際のIndexedDBキャッシュ状況をチェックする
    // 現時点では仮の値を返す
    return {
        cacheHits: 0,
        cacheMisses: chunks.length,
        isFullyCached: false,
    };
}

/**
 * 記事アクセス統計を記録
 * エラーが発生しても記事読み込みには影響しない
 */
export async function recordArticleStats({
    url,
    title,
    content,
    chunks,
}: RecordStatsParams): Promise<void> {
    try {
        // 記事ハッシュを計算
        const articleHash = await calculateHash(content);

        // ドメインを抽出
        const domain = extractDomain(url);

        // キャッシュ統計を計算
        const { cacheHits, cacheMisses, isFullyCached } = await calculateCacheStats(chunks);

        // 統計APIを呼び出し（非同期、エラー無視）
        const response = await retryFetch(() =>
            fetch('/api/stats/article', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    articleHash,
                    url,
                    title,
                    domain,
                    cacheHits,
                    cacheMisses,
                    isFullyCached,
                }),
                signal: AbortSignal.timeout(5000), // 5秒タイムアウト
            })
        );

        if (response.ok) {
            const data = await response.json();
            logger.info('記事統計を記録', {
                url,
                accessCount: data.accessCount,
                cacheHitRate: data.cacheHitRate,
            });
        } else {
            // エラーログのみ出力、処理は継続
            logger.warn('記事統計の記録に失敗', {
                status: response.status,
                url,
            });
        }
    } catch (error) {
        // エラーをログに記録するが、例外は投げない
        logger.warn('記事統計記録エラー', error);
    }
}
