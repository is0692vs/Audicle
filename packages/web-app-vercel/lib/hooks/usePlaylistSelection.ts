import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { Playlist } from "@/types/playlist";

/**
 * プレイリストアイテムIDからそのアイテムが属するプレイリスト一覧を取得
 */
export function usePlaylistItemPlaylists(itemId: string) {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;

    return useQuery({
        queryKey: ["playlist-item-playlists", userEmail, itemId],
        queryFn: async () => {
            const response = await fetch(`/api/playlist-items/${itemId}/playlists`);
            if (!response.ok) {
                throw new Error(
                    "プレイリストアイテムが所属するプレイリストの取得に失敗しました"
                );
            }
            return response.json() as Promise<Playlist[]>;
        },
        enabled: !!itemId && !!userEmail,
    });
}

/**
 * @deprecated usePlaylistItemPlaylists を使用してください
 */
export function useBookmarkPlaylists(bookmarkId: string) {
    return usePlaylistItemPlaylists(bookmarkId);
}

/**
 * ブックマークのプレイリスト関連付け更新ミューテーション
 */
export function useUpdateBookmarkPlaylistsMutation() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            bookmarkId: string;
            addToPlaylistIds: string[];
            removeFromPlaylistIds: string[];
        }) => {
            const response = await fetch("/api/playlists/bulk-update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error("プレイリストの更新に失敗しました");
            }
            return response.json();
        },
        onSuccess: () => {
            // ブックマーク関連の全てのキャッシュを無効化
            queryClient.invalidateQueries({ queryKey: ["bookmark-playlists", userEmail] });
            queryClient.invalidateQueries({ queryKey: ["bookmarks", userEmail] });
            queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
        },
    });
}
