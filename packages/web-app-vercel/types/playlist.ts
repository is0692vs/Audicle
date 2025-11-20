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

export interface Article {
    id: string;
    owner_email: string;
    url: string;
    title: string;
    thumbnail_url?: string;
    last_read_position?: number;
    created_at: string;
    updated_at: string;
}

export interface PlaylistItem {
    id: string;
    playlist_id: string;
    article_id: string;
    position: number;
    added_at: string;
}

export interface PlaylistItemWithArticle extends PlaylistItem {
    article?: Article;
}

export interface PlaylistWithItems extends Playlist {
    items?: PlaylistItemWithArticle[];
    playlist_items?: PlaylistItemWithArticle[];
    item_count?: number;
}

