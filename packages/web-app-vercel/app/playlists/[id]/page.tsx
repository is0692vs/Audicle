"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Play, ArrowUpDown } from "lucide-react";
import { createReaderUrl } from "@/lib/urlBuilder";
import { logger } from "@/lib/logger";
import { STORAGE_KEYS } from "@/lib/constants";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { usePlaylistPlayback } from "@/contexts/PlaylistPlaybackContext";
import {
  usePlaylistDetail,
  useUpdatePlaylistMutation,
  useRemoveFromPlaylistMutation,
} from "@/lib/hooks/usePlaylists";
import { ArticleCard } from "@/components/ArticleCard";
import { PlaylistSelectorModal } from "@/components/PlaylistSelectorModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  PlaylistWithItems,
  PlaylistItemWithArticle,
} from "@/types/playlist";

const SORT_OPTIONS = {
  position: "位置順 (昇順)",
  "position-desc": "位置順 (降順)",
  title: "タイトル順 (A-Z)",
  "title-desc": "タイトル順 (Z-A)",
  added_at: "追加日時順 (古い順)",
  "added_at-desc": "追加日時順 (新しい順)",
} as const;

type SortOption = keyof typeof SORT_OPTIONS;

// 型ガード関数
function isSortOption(value: string): value is SortOption {
  return value in SORT_OPTIONS;
}

export default function PlaylistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const playlistId = params.id as string;
  const { startPlaylistPlayback } = usePlaylistPlayback();

  const { data: playlist, isLoading, error } = usePlaylistDetail(playlistId);
  const updatePlaylistMutation = useUpdatePlaylistMutation();
  const removeFromPlaylistMutation = useRemoveFromPlaylistMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [selectedArticleTitle, setSelectedArticleTitle] = useState<string>("");
  // 追加: 初期値をlocalStorageから復元
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    if (typeof window === "undefined") return "position";
    const saved = localStorage.getItem(
      `${STORAGE_KEYS.PLAYLIST_SORT_PREFIX}${playlistId}`
    );
    return saved && isSortOption(saved) ? saved : "position";
  });
  const { showConfirm, confirmDialog } = useConfirmDialog();

  const sortedItems = useMemo(() => {
    if (!playlist?.items) return [];

    return [...playlist.items].sort((a, b) => {
      switch (sortOption) {
        case "position":
          return (a.position ?? 0) - (b.position ?? 0);
        case "position-desc":
          return (b.position ?? 0) - (a.position ?? 0);
        case "title":
          return (a.article?.title || "").localeCompare(b.article?.title || "");
        case "title-desc":
          return (b.article?.title || "").localeCompare(a.article?.title || "");
        case "added_at":
          return a.added_at.localeCompare(b.added_at);
        case "added_at-desc":
          return b.added_at.localeCompare(a.added_at);
        default:
          return 0;
      }
    });
  }, [playlist?.items, sortOption]);

  // playlistが読み込まれたら編集フィールドを初期化
  useEffect(() => {
    if (playlist && !isEditing) {
      setEditName(playlist.name);
      setEditDescription(playlist.description || "");
    }
  }, [playlist, isEditing]);

  // 追加: sortOption変更時にlocalStorageに保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      `${STORAGE_KEYS.PLAYLIST_SORT_PREFIX}${playlistId}`,
      sortOption
    );
  }, [sortOption, playlistId]);

  const handleSave = async () => {
    if (!playlist) return;

    try {
      await updatePlaylistMutation.mutateAsync({
        playlistId: playlist.id,
        name: editName,
        description: editDescription,
      });
      logger.success("プレイリストを更新", {
        id: playlist.id,
        name: editName,
      });
      setIsEditing(false);
    } catch (error) {
      logger.error("プレイリストの更新に失敗", error);
    }
  };

  const handleRemoveFromPlaylist = async (itemId: string, title: string) => {
    const confirmed = await showConfirm({
      title: "プレイリストから除く",
      message: `「${title}」を「${playlist?.name}」から除きますか?\n\n他のプレイリストには残ります。`,
      confirmText: "除く",
      cancelText: "キャンセル",
      isDangerous: false,
    });

    if (confirmed) {
      try {
        await removeFromPlaylistMutation.mutateAsync({
          playlistId,
          itemId,
        });
        logger.success("アイテムをプレイリストから削除", { itemId, title });
      } catch (error) {
        logger.error("アイテムの削除に失敗", error);
      }
    }
  };

  const handlePlaylistAdd = (articleId: string) => {
    const item = sortedItems.find((item) => item.article_id === articleId);
    if (item) {
      setSelectedArticleId(articleId);
      setSelectedArticleTitle(item.article?.title || "");
      setIsPlaylistModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-zinc-400 mb-6">
            {error instanceof Error
              ? error.message
              : "プレイリストの読み込みに失敗しました"}
          </p>
          <button
            onClick={() => router.push("/playlists")}
            className="text-violet-400 hover:text-violet-300"
          >
            ← プレイリスト一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {confirmDialog}

      {/* ヘッダー */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/playlists")}
            className="text-zinc-400 hover:text-primary transition-colors"
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
                disabled={updatePlaylistMutation.isPending}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-zinc-700 transition-colors"
              >
                {updatePlaylistMutation.isPending ? "保存中..." : "保存"}
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
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
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
              {playlist.items && playlist.items.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="size-4 text-zinc-400" />
                    <Select
                      value={sortOption}
                      onValueChange={(value) => {
                        if (isSortOption(value)) {
                          setSortOption(value);
                        }
                      }}
                    >
                      <SelectTrigger
                        data-testid="playlist-sort-select"
                        className="w-32"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={() => {
                      // If the playlist has items, open the reader at the first
                      // item's article URL so that the Reader can initialize the
                      // playlist context deterministically. Otherwise fall back to
                      // opening Reader with playlist ID only.
                      const firstArticleUrl =
                        playlist.items && playlist.items.length > 0
                          ? playlist.items[0].article?.url
                          : undefined;

                      router.push(
                        createReaderUrl({
                          articleUrl: firstArticleUrl,
                          playlistId: playlist.id,
                          playlistIndex: 0,
                          autoplay: true,
                        })
                      );
                    }}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Play className="size-4" />
                    再生
                  </button>
                </div>
              )}
            </div>
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
            {sortedItems.map((item, index) => (
              <ArticleCard
                key={item.id}
                item={item}
                onArticleClick={(playlistItem) => {
                  if (playlistItem.article?.url) {
                    router.push(
                      createReaderUrl({
                        articleUrl: playlistItem.article.url,
                        playlistId: playlist.id,
                        playlistIndex: index,
                        autoplay: true,
                      })
                    );
                  }
                }}
                href={
                  item.article?.url
                    ? createReaderUrl({
                        articleUrl: item.article.url,
                        playlistId: playlist.id,
                        playlistIndex: index,
                      })
                    : undefined
                }
                onPlaylistAdd={handlePlaylistAdd}
                onRemove={(id) =>
                  handleRemoveFromPlaylist(id, item.article?.title || "")
                }
              />
            ))}
          </div>
        )}
      </main>

      <PlaylistSelectorModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        articleId={selectedArticleId}
        articleTitle={selectedArticleTitle}
        onPlaylistsUpdated={async () => {
          // 必要に応じてプレイリストを再読み込み
        }}
      />
    </div>
  );
}
