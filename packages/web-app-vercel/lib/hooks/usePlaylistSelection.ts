import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { Playlist } from "@/types/playlist";

/**
 * プレイリストアイテムIDからそのアイテムが属するプレイリスト一覧を取得
 */
export function usePlaylistItemPlaylists(itemId: string, options?: { enabled?: boolean }) {
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
        enabled: options?.enabled !== undefined ? options.enabled : (!!itemId && !!userEmail),
    });
}

/**
 * 記事IDからその記事が属するプレイリスト一覧を取得
 */
export function useArticlePlaylists(articleId: string, options?: { enabled?: boolean }) {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;

    return useQuery<Playlist[]>({
        queryKey: ['article', 'playlists', articleId, userEmail],
        queryFn: async () => {
            const response = await fetch(`/api/articles/${articleId}/playlists`)
            if (!response.ok) throw new Error('Failed to fetch playlists')
            return response.json()
        },
        enabled: options?.enabled !== undefined ? options.enabled : (!!articleId && !!userEmail),
    })
}
export function useUpdateArticlePlaylistsMutation() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            articleId: string;
            addToPlaylistIds: string[];
            removeFromPlaylistIds: string[];
        }) => {
            const response = await fetch("/api/playlists/bulk_update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error("プレイリストの更新に失敗しました");
            }
            return response.json();
        },
        onSuccess: (data, variables) => {
            // 更新対象の特定の記事のプレイリストキャッシュのみを無効化
            queryClient.invalidateQueries({ queryKey: ['article', 'playlists', variables.articleId, userEmail] });
            queryClient.invalidateQueries({ queryKey: ['playlist-item-playlists'] });
            queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
        },
    });
}
