import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { Playlist } from "@/types/playlist";

/**
 * ブックマークIDからそのブックマークが属するプレイリスト一覧を取得
 */
export function useBookmarkPlaylists(bookmarkId: string) {
    return useQuery({
        queryKey: ["bookmark-playlists", bookmarkId],
        queryFn: async () => {
            const response = await fetch(`/api/bookmarks/${bookmarkId}/playlists`);
            if (!response.ok) {
                throw new Error(
                    "ブックマークが所属するプレイリストの取得に失敗しました"
                );
            }
            return response.json() as Promise<Playlist[]>;
        },
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        enabled: !!bookmarkId,
    });
}

/**
 * ブックマークのプレイリスト関連付け更新ミューテーション
 */
export function useUpdateBookmarkPlaylistsMutation() {
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
            queryClient.invalidateQueries({ queryKey: ["bookmark-playlists"] });
            queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
            queryClient.invalidateQueries({ queryKey: ["playlists"] });
        },
    });
}
