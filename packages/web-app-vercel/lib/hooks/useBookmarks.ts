import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { Bookmark, PlaylistWithItems } from "@/types/playlist";

/**
 * デフォルトプレイリストのブックマーク一覧を取得
 */
export function useBookmarks() {
    return useQuery({
        queryKey: ["bookmarks"],
        queryFn: async () => {
            const response = await fetch("/api/playlists/default");
            if (!response.ok) {
                throw new Error("ブックマークの取得に失敗しました");
            }
            const playlist: PlaylistWithItems = await response.json();
            return playlist.items?.map((item) => item.bookmark) || [];
        },
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
    });
}

/**
 * ブックマーク削除ミューテーション
 */
export function useDeleteBookmarkMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (bookmarkId: string) => {
            const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                throw new Error("削除に失敗しました");
            }
            return response.json();
        },
        onSuccess: () => {
            // ブックマークと プレイリスト両方を無効化
            queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
            queryClient.invalidateQueries({ queryKey: ["playlists"] });
        },
    });
}

/**
 * ブックマーク追加ミューテーション
 */
export function useAddBookmarkMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            url: string;
            title: string;
            content: string;
        }) => {
            const response = await fetch("/api/bookmarks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error("追加に失敗しました");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
            queryClient.invalidateQueries({ queryKey: ["playlists"] });
        },
    });
}
