"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { logger } from "@/lib/logger";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { ArticleCard } from "@/components/ArticleCard";
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
  const sortedItems = useMemo(() => {
    if (!playlist?.items) return [];
    return [...playlist.items].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    );
  }, [playlist?.items]);

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
          description: editDescription,
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
            item_count: (prev.item_count ?? 0) - 1,
          };
        });
        logger.success("ブックマークを削除", { id: bookmarkId, title });
      } catch (error) {
        logger.error("ブックマークの削除に失敗", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  if (!playlist) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {confirmDialog}

      {/* ヘッダー */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/playlists")}
            className="text-zinc-400 hover:text-violet-400 transition-colors"
          >
            ← プレイリスト一覧
          </button>
          {!playlist.is_default && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
            >
              編集
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-700 rounded-lg bg-zinc-800 focus:ring-2 focus:ring-violet-600 focus:border-transparent"
              required
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-700 rounded-lg bg-zinc-800 focus:ring-2 focus:ring-violet-600 focus:border-transparent"
              rows={3}
              placeholder="説明（省略可）"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-zinc-700 transition-colors"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditName(playlist.name);
                  setEditDescription(playlist.description || "");
                }}
                className="px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold">{playlist.name}</h1>
              {playlist.is_default && (
                <span className="px-2 py-1 text-xs bg-violet-900 text-violet-300 rounded">
                  デフォルト
                </span>
              )}
            </div>
            {playlist.description && (
              <p className="text-zinc-400">{playlist.description}</p>
            )}
            <p className="text-sm text-zinc-500 mt-2">
              {playlist.item_count || 0} 件の記事
            </p>
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto overflow-x-hidden">
        {!playlist.items || playlist.items.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <p>まだ記事がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8">
            {sortedItems.map((item) => (
              <ArticleCard
                key={item.id}
                article={{
                  ...item.bookmark,
                  created_at: item.added_at,
                }}
                onArticleClick={(article) =>
                  router.push(
                    `/reader?url=${encodeURIComponent(article.article_url)}`
                  )
                }
                onPlaylistAdd={() => {}}
                onDelete={(id) =>
                  handleDeleteBookmark(id, item.bookmark.article_title)
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
