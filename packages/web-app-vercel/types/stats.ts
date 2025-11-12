// Statistics and popular articles types

export type Period = 'today' | 'week' | 'month' | 'all';

export interface PopularArticle {
    articleHash: string;
    url: string;
    title: string;
    domain: string;
    accessCount: number;
    uniqueUsers: number;
    cacheHitRate: number;
    isFullyCached: boolean;
    lastAccessedAt: string; // ISO 8601形式
}

export interface PopularArticlesResponse {
    articles: PopularArticle[];
    total: number;
}
