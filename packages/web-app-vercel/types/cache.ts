export interface ArticleMetadata {
    articleUrl: string;
    articleHash: string;       // 記事全体のハッシュ（編集検知用）
    voice: string;
    totalChunks: number;
    readCount: number;
    completedPlayback: boolean; // 最後まで順番に再生されたか
    lastPlayedChunk: number;
    lastUpdated: string;        // ISO文字列
    lastAccessed: string;       // ISO文字列
}
