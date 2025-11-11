/**
 * リーダーページのURLを生成するユーティリティ関数
 */

export interface ReaderUrlParams {
    articleUrl?: string;
    articleId?: string;
    playlistId?: string;
    playlistIndex?: number;
    autoplay?: boolean;
}

/**
 * リーダーURLを生成
 * @param params URLパラメータオブジェクト
 * @returns 生成されたURL
 */
export function createReaderUrl(params: ReaderUrlParams): string {
    const searchParams = new URLSearchParams();

    if (params.articleId) {
        searchParams.set("id", params.articleId);
    }

    if (params.articleUrl) {
        searchParams.set("url", params.articleUrl);
    }

    if (params.playlistId) {
        searchParams.set("playlist", params.playlistId);
        if (params.playlistIndex !== undefined) {
            searchParams.set("index", params.playlistIndex.toString());
        }
    }

    if (params.autoplay) {
        searchParams.set("autoplay", "true");
    }

    return `/reader?${searchParams.toString()}`;
}
