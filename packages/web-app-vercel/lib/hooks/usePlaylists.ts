import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { PlaylistWithItems } from "@/types/playlist";

/**
 * プレイリスト一覧を取得
 */
export function usePlaylists() {
    return useQuery({
        queryKey: ["playlists"],
        queryFn: async () => {
            const response = await fetch("/api/playlists");
            if (!response.ok) {
                throw new Error("プレイリストの取得に失敗しました");
            }
            return response.json() as Promise<PlaylistWithItems[]>;
        },
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
    });
}

/**
 * プレイリスト詳細を取得
 */
export function usePlaylistDetail(playlistId: string) {
    return useQuery({
        queryKey: ["playlists", playlistId],
        queryFn: async () => {
            const response = await fetch(`/api/playlists/${playlistId}`);
            if (!response.ok) {
                throw new Error("プレイリストの取得に失敗しました");
            }
            return response.json() as Promise<PlaylistWithItems>;
        },
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        enabled: !!playlistId,
    });
}

/**
 * プレイリスト作成ミューテーション
 */
export function useCreatePlaylistMutation() {
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
            queryClient.invalidateQueries({ queryKey: ["playlists"] });
        },
    });
}

/**
 * プレイリスト削除ミューテーション
 */
export function useDeletePlaylistMutation() {
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
            queryClient.invalidateQueries({ queryKey: ["playlists"] });
        },
    });
}

/**
 * プレイリスト更新ミューテーション
 */
export function useUpdatePlaylistMutation() {
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
            queryClient.invalidateQueries({ queryKey: ["playlists"] });
            queryClient.invalidateQueries({
                queryKey: ["playlists", variables.playlistId],
            });
        },
    });
}
