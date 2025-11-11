import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { PlaylistWithItems } from "@/types/playlist";

/**
 * プレイリスト一覧を取得
 */
export function usePlaylists() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;

    return useQuery({
        queryKey: ["playlists", userEmail],
        queryFn: async () => {
            const response = await fetch("/api/playlists");
            if (!response.ok) {
                throw new Error("プレイリストの取得に失敗しました");
            }
            return response.json() as Promise<PlaylistWithItems[]>;
        },
        enabled: !!userEmail,
    });
}

/**
 * プレイリスト詳細を取得
 */
export function usePlaylistDetail(playlistId: string) {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;

    return useQuery({
        queryKey: ["playlists", userEmail, playlistId],
        queryFn: async () => {
            const response = await fetch(`/api/playlists/${playlistId}`);
            if (!response.ok) {
                throw new Error("プレイリストの取得に失敗しました");
            }
            return response.json() as Promise<PlaylistWithItems>;
        },
        enabled: !!playlistId && !!userEmail,
    });
}

/**
 * プレイリスト作成ミューテーション
 */
export function useCreatePlaylistMutation() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { name: string; description?: string }) => {
            const response = await fetch("/api/playlists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error("プレイリストの作成に失敗しました");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
        },
    });
}

/**
 * プレイリスト削除ミューテーション
 */
export function useDeletePlaylistMutation() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (playlistId: string) => {
            const response = await fetch(`/api/playlists/${playlistId}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "削除に失敗しました");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
        },
    });
}

/**
 * プレイリスト更新ミューテーション
 */
export function useUpdatePlaylistMutation() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            playlistId: string;
            name: string;
            description?: string;
        }) => {
            const response = await fetch(`/api/playlists/${data.playlistId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name,
                    description: data.description,
                }),
            });
            if (!response.ok) {
                throw new Error("プレイリストの更新に失敗しました");
            }
            return response.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
            queryClient.invalidateQueries({
                queryKey: ["playlists", userEmail, variables.playlistId],
            });
        },
    });
}

/**
 * プレイリストからアイテムを削除するミューテーション
 */
export function useRemoveFromPlaylistMutation() {
    const { data: session } = useSession();
    const userEmail = session?.user?.email;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { playlistId: string; itemId: string }) => {
            const response = await fetch(
                `/api/playlists/${data.playlistId}/items/${data.itemId}`,
                {
                    method: "DELETE",
                }
            );
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "アイテムの削除に失敗しました");
            }
            return response.json();
        },
        onSuccess: (_, variables) => {
            // すべてのプレイリストキャッシュを無効化
            queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
            queryClient.invalidateQueries({
                queryKey: ["playlists", userEmail, variables.playlistId],
            });
            queryClient.invalidateQueries({
                queryKey: ["playlists/default"],
            });
        },
    });
}
