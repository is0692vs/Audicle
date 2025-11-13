import type { ArticleMetadata } from '@/types/cache';

/**
 * Vercel KVのHash形式からArticleMetadataに変換
 */
export function parseArticleMetadata(hash: Record<string, unknown> | null): ArticleMetadata | null {
    // 必須フィールドのチェック
    if (!hash || typeof hash.articleUrl !== 'string' || !hash.articleUrl) {
        return null;
    }

    // 数値フィールドのパース
    const totalChunks = parseInt(String(hash.totalChunks ?? 0), 10);
    const readCount = parseInt(String(hash.readCount ?? 0), 10);
    const lastPlayedChunk = parseInt(String(hash.lastPlayedChunk ?? 0), 10);

    // NaNチェック
    if (isNaN(totalChunks) || isNaN(readCount) || isNaN(lastPlayedChunk)) {
        return null;
    }

    return {
        articleUrl: hash.articleUrl,
        articleHash: String(hash.articleHash ?? ''),
        voice: String(hash.voice ?? ''),
        totalChunks,
        readCount,
        completedPlayback: String(hash.completedPlayback) === 'true',
        lastPlayedChunk,
        lastUpdated: String(hash.lastUpdated ?? ''),
        lastAccessed: String(hash.lastAccessed ?? ''),
    };
}

/**
 * ArticleMetadataをVercel KVのHash形式に変換
 */
export function serializeArticleMetadata(metadata: Partial<ArticleMetadata>): Record<string, string> {
    const result: Record<string, string> = {};

    if (metadata.articleUrl) result.articleUrl = metadata.articleUrl;
    if (metadata.articleHash) result.articleHash = metadata.articleHash;
    if (metadata.voice) result.voice = metadata.voice;
    if (typeof metadata.totalChunks === 'number') result.totalChunks = metadata.totalChunks.toString();
    if (typeof metadata.readCount === 'number') result.readCount = metadata.readCount.toString();
    if (typeof metadata.completedPlayback === 'boolean') result.completedPlayback = metadata.completedPlayback.toString();
    if (typeof metadata.lastPlayedChunk === 'number') result.lastPlayedChunk = metadata.lastPlayedChunk.toString();
    if (metadata.lastUpdated) result.lastUpdated = metadata.lastUpdated;
    if (metadata.lastAccessed) result.lastAccessed = metadata.lastAccessed;

    return result;
}
