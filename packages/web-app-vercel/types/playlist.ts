export interface Playlist {
    id: string;
    owner_email: string;
    name: string;
    description?: string;
    visibility: 'private' | 'shared' | 'collaborative';
    share_url?: string;
    is_default: boolean;
    allow_fork: boolean;
    created_at: string;
    updated_at: string;
}

export interface Bookmark {
    id: string;
    owner_email: string;
    article_url: string;
    article_title: string;
    description?: string;
    source?: string;
    thumbnail_url?: string;
    last_read_position?: number;
    created_at: string;
    updated_at: string;
}

export interface PlaylistItem {
    id: string;
    playlist_id: string;
    bookmark_id: string;
    position: number;
    added_at: string;
}

export interface PlaylistWithItems extends Playlist {
    items?: Array<PlaylistItem & { bookmark: Bookmark }>;
    item_count?: number;
}
