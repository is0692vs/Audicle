import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { Bookmark, PlaylistWithItems } from "@/types/playlist";

/**
 * デフォルトプレイリストのブックマーク一覧を取得
 */
export function useBookmarks() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;

    return useQuery({
        queryKey: ["bookmarks", userEmail],
        queryFn: async () => {
            const response = await fetch("/api/playlists/default");
            if (!response.ok) {
                throw new Error("ブックマークの取得に失敗しました");
            }
            const playlist: PlaylistWithItems = await response.json();
            return playlist.items?.map((item) => item.bookmark) || [];
        },
        enabled: !!userEmail,
    });
}

/**
 * ブックマーク削除ミューテーション
 */
export function useDeleteBookmarkMutation() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;
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
            queryClient.invalidateQueries({ queryKey: ["bookmarks", userEmail] });
            queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
        },
    });
}

/**
 * ブックマーク追加ミューテーション
 */
export function useAddBookmarkMutation() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;
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
            queryClient.invalidateQueries({ queryKey: ["bookmarks", userEmail] });
            queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
        },
    });
}
