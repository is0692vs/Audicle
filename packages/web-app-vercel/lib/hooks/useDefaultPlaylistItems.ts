"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { setArticlesCache } from "@/lib/local-cache";
import type { PlaylistWithItems } from "@/types/playlist";

/**
 * デフォルトプレイリストのアイテム一覧を取得
 */
export function useDefaultPlaylistItems() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;

    const query = useQuery({
        queryKey: ["defaultPlaylist", "items", userEmail],
        queryFn: async () => {
            const response = await fetch("/api/playlists/default");
            if (!response.ok) {
                throw new Error("プレイリストの取得に失敗しました");
            }
            const playlist: PlaylistWithItems = await response.json();
            return {
                playlistId: playlist.id,
                playlistName: playlist.name,
                items: playlist.items || [],
            };
        },
        enabled: !!userEmail,
    });

    useEffect(() => {
        if (query.data) {
            setArticlesCache(query.data);
        }
    }, [query.data]);

    return query;
}
