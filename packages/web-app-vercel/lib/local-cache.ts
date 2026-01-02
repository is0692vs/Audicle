import { STORAGE_KEYS } from "./constants";
import { PlaylistItemWithArticle } from "@/types/playlist";

export interface CachedPlaylistData {
    playlistId: string;
    playlistName: string;
    items: PlaylistItemWithArticle[];
}

export function getArticlesCache(): CachedPlaylistData | null {
    if (typeof window === "undefined") return null;
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.ARTICLES_CACHE);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

export function setArticlesCache(data: CachedPlaylistData): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEYS.ARTICLES_CACHE, JSON.stringify(data));
    } catch { }
}
