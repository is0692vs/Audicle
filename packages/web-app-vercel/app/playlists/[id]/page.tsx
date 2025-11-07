"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { logger } from "@/lib/logger";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import type { PlaylistWithItems } from "@/types/playlist";

export default function PlaylistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const playlistId = params.id as string;

  const [playlist, setPlaylist] = useState<PlaylistWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { showConfirm, confirmDialog } = useConfirmDialog();

  const loadPlaylist = useCallback(async () => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}`);

      if (!response.ok) {
        throw new Error("プレイリストの取得に失敗しました");
      }

      const data: PlaylistWithItems = await response.json();
      logger.info("プレイリスト詳細を読み込み", {
        id: data.id,
        name: data.name,
      });
      setPlaylist(data);
      setEditName(data.name);
      setEditDescription(data.description || "");
    } catch (error) {
      logger.error("プレイリスト詳細の読み込みに失敗", error);
      router.push("/playlists");
    } finally {
      setIsLoading(false);
    }
  }, [playlistId, router]);

  useEffect(() => {
    if (playlistId) {
      loadPlaylist();
    }
  }, [playlistId, loadPlaylist]);

  const handleSave = async () => {
    if (!playlist) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("プレイリストの更新に失敗しました");
      }

      const updated = await response.json();
      logger.success("プレイリストを更新", {
        id: updated.id,
        name: updated.name,
      });
      setPlaylist({ ...playlist, ...updated });
      setIsEditing(false);
    } catch (error) {
      logger.error("プレイリストの更新に失敗", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string, title: string) => {
    const confirmed = await showConfirm({
      title: "ブックマークを削除",
      message: `「${title}」を削除しますか？`,
      confirmText: "削除",
      cancelText: "キャンセル",
      isDangerous: true,
    });

    if (confirmed) {
      try {
        const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("削除に失敗しました");
        }

        setPlaylist((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items?.filter(
              (item) => item.bookmark.id !== bookmarkId
            ),
            item_count: (prev.item_count || 1) - 1,
          };
        });
        logger.success("ブックマークを削除", { id: bookmarkId, title });
      } catch (error) {
        logger.error("ブックマークの削除に失敗", error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (!playlist) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {confirmDialog}
      {/* ヘッダー */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/playlists")}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                ← プレイリスト一覧
              </button>
            </div>
            {!playlist.is_default && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                編集
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-foreground"
                required
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-foreground"
                rows={3}
                placeholder="説明（省略可）"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {isSaving ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(playlist.name);
                    setEditDescription(playlist.description || "");
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{playlist.name}</h1>
                {playlist.is_default && (
                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    デフォルト
                  </span>
                )}
              </div>
              {playlist.description && (
                <p className="text-gray-600 dark:text-gray-400">
                  {playlist.description}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {playlist.item_count || 0} 件の記事
              </p>
            </>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto p-4">
        {!playlist.items || playlist.items.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>まだ記事がありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playlist.items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/reader?url=${encodeURIComponent(
                          item.bookmark.article_url
                        )}`
                      )
                    }
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {item.bookmark.article_title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {item.bookmark.article_url}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>{formatDate(item.added_at)}</span>
                      {item.bookmark.last_read_position !== undefined &&
                        item.bookmark.last_read_position > 0 && (
                          <span>
                            読書位置: {item.bookmark.last_read_position}
                          </span>
                        )}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleDeleteBookmark(
                        item.bookmark.id,
                        item.bookmark.article_title
                      )
                    }
                    className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                    title="削除"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
