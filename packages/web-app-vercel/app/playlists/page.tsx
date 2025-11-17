"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import {
  usePlaylists,
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  useSetDefaultPlaylistMutation,
} from "@/lib/hooks/usePlaylists";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { logger } from "@/lib/logger";

type PlaylistSortBy = "newest" | "oldest" | "name" | "count";

export default function PlaylistsPage() {
  const router = useRouter();
  const { data: playlists = [], isLoading, error } = usePlaylists();
  const createPlaylistMutation = useCreatePlaylistMutation();
  const deletePlaylistMutation = useDeletePlaylistMutation();
  const setDefaultPlaylistMutation = useSetDefaultPlaylistMutation();

  const [sortBy, setSortBy] = useState<PlaylistSortBy>("newest");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const { showConfirm, confirmDialog } = useConfirmDialog();

  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "name":
          return a.name.localeCompare(b.name);
        case "count":
          return (b.item_count || 0) - (a.item_count || 0);
        default:
          return 0;
      }
    });
  }, [playlists, sortBy]);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createPlaylistMutation.mutateAsync({
        name: newPlaylistName,
        description: newPlaylistDescription || undefined,
      });
      logger.success("プレイリストを作成", { name: newPlaylistName });
      setShowCreateForm(false);
      setNewPlaylistName("");
      setNewPlaylistDescription("");
    } catch (error) {
      logger.error("プレイリストの作成に失敗", error);
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
        await deletePlaylistMutation.mutateAsync(id);
        logger.success("プレイリストを削除", { id, name });
      } catch (error) {
        logger.error("プレイリストの削除に失敗", error);
        alert(error instanceof Error ? error.message : "削除に失敗しました");
      }
    }
  };

  const handleSetDefaultPlaylist = async (
    e: React.MouseEvent,
    id: string,
    name: string
  ) => {
    e.stopPropagation();

    try {
      await setDefaultPlaylistMutation.mutateAsync(id);
      logger.success("デフォルトプレイリストを更新", { id, name });
    } catch (error) {
      logger.error("デフォルト設定に失敗", error);
      alert(error instanceof Error ? error.message : "設定に失敗しました");
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-linear-to-b from-zinc-900 to-black">
        <div className="p-4 sm:p-6 lg:p-8">
          {confirmDialog}

          {/* Page Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl lg:text-3xl font-bold">プレイリスト</h2>
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as PlaylistSortBy)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="ソート" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">新しい順</SelectItem>
                    <SelectItem value="oldest">古い順</SelectItem>
                    <SelectItem value="name">名前順</SelectItem>
                    <SelectItem value="count">記事数順</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm lg:text-base text-zinc-400">
              記事をプレイリストで整理
            </p>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <Card className="bg-zinc-900 border-zinc-800 mb-6">
              <CardContent className="p-4 lg:p-6">
                <form onSubmit={handleCreatePlaylist}>
                  <h3 className="text-lg font-bold mb-4">新しいプレイリスト</h3>
                  <div className="space-y-3">
                    <Input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="プレイリスト名"
                      className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500"
                      required
                      autoFocus
                      data-testid="playlist-name-input"
                    />
                    <textarea
                      value={newPlaylistDescription}
                      onChange={(e) =>
                        setNewPlaylistDescription(e.target.value)
                      }
                      placeholder="説明（省略可）"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 text-sm lg:text-base"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={createPlaylistMutation.isPending}
                        className="bg-violet-600 hover:bg-violet-700"
                        data-testid="save-playlist-button"
                      >
                        {createPlaylistMutation.isPending
                          ? "作成中..."
                          : "作成"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewPlaylistName("");
                          setNewPlaylistDescription("");
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-lg">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                エラーが発生しました
              </h3>
              <p className="text-zinc-400">
                {error instanceof Error
                  ? error.message
                  : "プレイリストの読み込みに失敗しました"}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Create New Card - 先頭に配置 */}
              <Card
                className="bg-zinc-900 border-zinc-800 border-dashed hover:bg-zinc-800 transition-colors cursor-pointer"
                onClick={() => setShowCreateForm(true)}
                data-testid="create-playlist-button"
              >
                <CardContent className="p-4 lg:p-6 h-full flex flex-col items-center justify-center text-center min-h-[250px]">
                  <Plus className="size-10 lg:size-12 text-zinc-600 mb-2" />
                  <p className="text-zinc-400 text-sm lg:text-base">新規作成</p>
                </CardContent>
              </Card>

              {sortedPlaylists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlists/${playlist.id}`}
                  className="group"
                  data-testid="playlist-item"
                >
                  <Card className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer">
                    <CardContent className="p-4 lg:p-6">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-base lg:text-lg truncate flex-1">
                          {playlist.name}
                        </h3>
                        {playlist.is_default && (
                          <span className="px-2 py-0.5 text-xs bg-blue-600/20 text-blue-400 rounded shrink-0">
                            デフォルト
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">
                        {playlist.item_count || 0} 件の記事
                      </p>
                      {playlist.description && (
                        <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                          {playlist.description}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3">
                        {!playlist.is_default && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) =>
                                handleSetDefaultPlaylist(
                                  e,
                                  playlist.id,
                                  playlist.name
                                )
                              }
                              disabled={setDefaultPlaylistMutation.isPending}
                              className="flex-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
                            >
                              {setDefaultPlaylistMutation.isPending
                                ? "設定中..."
                                : "デフォルトに設定"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlaylist(
                                  playlist.id,
                                  playlist.name
                                );
                              }}
                              className="flex-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
                            >
                              削除
                            </Button>
                          </>
                        )}
                        {playlist.is_default && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled
                            className="w-full text-xs text-zinc-500 hover:bg-transparent"
                          >
                            デフォルト設定済み
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
