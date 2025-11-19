import { randomUUID } from 'crypto';

/**
 * Very small in-memory supabase fallback for tests.
 * Implements minimal operations used by playlist endpoints.
 */

interface Article {
    id: string;
    owner_email: string;
    url: string;
    title: string;
    thumbnail_url?: string | null;
    last_read_position?: number;
    created_at?: string;
}

interface Playlist {
    id: string;
    owner_email: string | null;
    name: string;
    description?: string | null;
    visibility: string;
    is_default: boolean;
    created_at: string;
}

interface PlaylistItem {
    id: string;
    playlist_id: string;
    article_id: string;
    position: number | null;
    added_at: string;
}

const inMemoryDB: {
    playlists: Playlist[];
    articles: Article[];
    playlist_items: PlaylistItem[];
} = {
    playlists: [],
    articles: [],
    playlist_items: [],
};

export function resetInMemorySupabase() {
    inMemoryDB.playlists = [];
    inMemoryDB.articles = [];
    inMemoryDB.playlist_items = [];
}

export async function createPlaylist(email: string | null, name: string, description?: string | null) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const playlist: Playlist = {
        id,
        owner_email: email,
        name,
        description: description || null,
        visibility: 'private',
        is_default: false,
        created_at: now,
    };
    inMemoryDB.playlists.push(playlist);
    return playlist;
}

export async function getPlaylistsForOwner(email: string | null) {
    return inMemoryDB.playlists
        .filter(p => p.owner_email === email)
        .map(p => ({
            ...p,
            playlist_items: inMemoryDB.playlist_items.filter(i => i.playlist_id === p.id),
        }));
}

export async function deletePlaylistById(ownerEmail: string | null, id: string) {
    const idx = inMemoryDB.playlists.findIndex(p => p.id === id && p.owner_email === ownerEmail);
    if (idx === -1) return false;
    const [removed] = inMemoryDB.playlists.splice(idx, 1);
    // remove associated items
    inMemoryDB.playlist_items = inMemoryDB.playlist_items.filter(i => i.playlist_id !== removed.id);
    return true;
}

export async function upsertArticle(ownerEmail: string | null, url: string, title: string, thumbnail_url?: string | null, last_read_position?: number) {
    let article = inMemoryDB.articles.find(a => a.owner_email === ownerEmail && a.url === url);
    if (!article) {
        article = {
            id: randomUUID(),
            owner_email: ownerEmail || '',
            url,
            title,
            thumbnail_url: thumbnail_url || null,
            last_read_position: last_read_position || 0,
            created_at: new Date().toISOString(),
        };
        inMemoryDB.articles.push(article);
    } else {
        // update title & thumbnail if provided
        article.title = title || article.title;
        article.thumbnail_url = thumbnail_url || article.thumbnail_url || null;
    }
    return article;
}

export async function addPlaylistItem(playlistId: string, articleId: string) {
    // If item exists, return it
    const existing = inMemoryDB.playlist_items.find(pi => pi.playlist_id === playlistId && pi.article_id === articleId);
    if (existing) return existing;

    // Determine position: find max position for playlist
    const items = inMemoryDB.playlist_items.filter(i => i.playlist_id === playlistId);
    const maxPos = items.length === 0 ? 0 : Math.max(...items.map(i => i.position ?? 0));

    const item: PlaylistItem = {
        id: randomUUID(),
        playlist_id: playlistId,
        article_id: articleId,
        position: maxPos + 1,
        added_at: new Date().toISOString(),
    };
    inMemoryDB.playlist_items.push(item);
    return item;
}

export async function getPlaylistWithItems(ownerEmail: string | null, id: string, sort?: { field?: string; order?: 'asc' | 'desc' }) {
    const playlist = inMemoryDB.playlists.find(p => p.id === id && p.owner_email === ownerEmail);
    if (!playlist) return null;

    // Collect items with article info
    const items = inMemoryDB.playlist_items
        .filter(pi => pi.playlist_id === playlist.id)
        .map(pi => {
            const article = inMemoryDB.articles.find(a => a.id === pi.article_id);
            return {
                ...pi,
                article: article || null,
            };
        });

    // Basic sorting
    let sorted = items;
    if (sort?.field === 'title') {
        sorted = [...items].sort((a, b) => {
            const at = a.article?.title || '';
            const bt = b.article?.title || '';
            if (sort.order === 'desc') return bt.localeCompare(at);
            return at.localeCompare(bt);
        });
    } else if (sort?.field === 'added_at') {
        sorted = [...items].sort((a, b) => {
            if (sort.order === 'desc') return b.added_at.localeCompare(a.added_at);
            return a.added_at.localeCompare(b.added_at);
        });
    } else {
        // default: position
        sorted = [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        if (sort?.order === 'desc') sorted = sorted.reverse();
    }

    return {
        ...playlist,
        playlist_items: sorted,
    };
}

export async function setDefaultPlaylist(ownerEmail: string | null, id: string) {
    // clear current default
    inMemoryDB.playlists.forEach(p => {
        if (p.owner_email === ownerEmail) p.is_default = false;
    });
    const target = inMemoryDB.playlists.find(p => p.id === id && p.owner_email === ownerEmail);
    if (!target) return null;
    target.is_default = true;
    return target;
}

export async function removePlaylistItem(playlistId: string, itemId: string) {
    const idx = inMemoryDB.playlist_items.findIndex(i => i.id === itemId && i.playlist_id === playlistId);
    if (idx === -1) return false;
    inMemoryDB.playlist_items.splice(idx, 1);
    return true;
}

export async function updatePlaylist(playlistId: string, ownerEmail: string | null, data: { name: string; description?: string | null }) {
    const target = inMemoryDB.playlists.find(p => p.id === playlistId && p.owner_email === ownerEmail);
    if (!target) return null;
    target.name = data.name;
    target.description = data.description || null;
    return target;
}
