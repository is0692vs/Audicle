import { STORAGE_KEYS } from "./constants";
import { PlaylistItemWithArticle } from "@/types/playlist";

export interface CachedPlaylistData {
    playlistId: string;
    playlistName: string;
    items: PlaylistItemWithArticle[];
}

export function getArticlesCache(userId: string): CachedPlaylistData | null {
    if (typeof window === "undefined" || !userId) return null;
    try {
        const key = `${STORAGE_KEYS.ARTICLES_CACHE}-${userId}`;
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const parsed = JSON.parse(cached);

        // Runtime validation
        if (isValidCachedData(parsed)) {
            return parsed;
        }

        console.warn("Invalid cache structure detected");
        return null;
    } catch (error) {
        console.error("Failed to read articles cache:", error);
        return null;
    }
}

function isValidCachedData(data: any): data is CachedPlaylistData {
    return (
        typeof data === "object" &&
        data !== null &&
        typeof data.playlistId === "string" &&
        typeof data.playlistName === "string" &&
        Array.isArray(data.items)
    );
}

export function setArticlesCache(userId: string, data: CachedPlaylistData): void {
    if (typeof window === "undefined" || !userId) return;
    try {
        const key = `${STORAGE_KEYS.ARTICLES_CACHE}-${userId}`;
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn("Failed to save articles to cache:", error);
    }
}
