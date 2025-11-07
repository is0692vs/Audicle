"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import type { PlaylistWithItems } from "@/types/playlist";

export default function PlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { showConfirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const response = await fetch("/api/playlists");

      if (!response.ok) {
        throw new Error("プレイリストの取得に失敗しました");
      }

      const data: PlaylistWithItems[] = await response.json();
      logger.info("プレイリスト一覧を読み込み", { count: data.length });
      setPlaylists(data);
    } catch (error) {
      logger.error("プレイリスト一覧の読み込みに失敗", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDescription || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("プレイリストの作成に失敗しました");
      }

      const newPlaylist = await response.json();
      logger.success("プレイリストを作成", { id: newPlaylist.id, name: newPlaylist.name });
      
      setPlaylists((prev) => [newPlaylist, ...prev]);
      setShowCreateForm(false);
      setNewPlaylistName("");
      setNewPlaylistDescription("");
    } catch (error) {
      logger.error("プレイリストの作成に失敗", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePlaylist = async (id: string, name: string) => {
    const confirmed = await showConfirm({
      title: "プレイリストを削除",
      message: `「${name}」を削除しますか？`,
      confirmText: "削除",
      cancelText: "キャンセル",
      isDangerous: true,
    });

    if (confirmed) {
      try {
        const response = await fetch(`/api/playlists/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "削除に失敗しました");
        }

        setPlaylists((prev) => prev.filter((p) => p.id !== id));
        logger.success("プレイリストを削除", { id, name });
      } catch (error) {
        logger.error("プレイリストの削除に失敗", error);
        alert(error instanceof Error ? error.message : "削除に失敗しました");
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {confirmDialog}
      {/* ヘッダー */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                ← 戻る
              </button>
              <h1 className="text-2xl font-bold">プレイリスト</h1>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 新規作成
            </button>
          </div>

          {/* 作成フォーム */}
          {showCreateForm && (
            <form onSubmit={handleCreatePlaylist} className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">新しいプレイリスト</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="プレイリスト名"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-foreground"
                  required
                  autoFocus
                />
                <textarea
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  placeholder="説明（省略可）"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-foreground"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isCreating ? "作成中..." : "作成"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewPlaylistName("");
                      setNewPlaylistDescription("");
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>読み込み中...</p>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>プレイリストがありません</p>
            <p className="text-sm mt-2">「+ 新規作成」からプレイリストを作成してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => router.push(`/playlists/${playlist.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {playlist.name}
                      </h3>
                      {playlist.is_default && (
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          デフォルト
                        </span>
                      )}
                    </div>
                    {playlist.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {playlist.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>{playlist.item_count || 0} 件</span>
                      <span>{formatDate(playlist.created_at)}</span>
                    </div>
                  </div>
                  {!playlist.is_default && (
                    <button
                      onClick={() => handleDeletePlaylist(playlist.id, playlist.name)}
                      className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                      title="削除"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
