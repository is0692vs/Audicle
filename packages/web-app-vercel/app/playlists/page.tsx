"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List, Plus } from "lucide-react";
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
      logger.success("プレイリストを作成", {
        id: newPlaylist.id,
        name: newPlaylist.name,
      });

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

  return (
    <AppLayout>
      {confirmDialog}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 lg:mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">
              プレイリスト
            </h2>
            <p className="text-sm lg:text-base text-zinc-400">
              記事をプレイリストで整理
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </div>

        {/* 作成フォーム */}
        {showCreateForm && (
          <Card className="bg-zinc-900 border-zinc-800 mb-6">
            <CardContent className="p-4 lg:p-6">
              <h3 className="text-lg font-semibold mb-4">新しいプレイリスト</h3>
              <form onSubmit={handleCreatePlaylist} className="space-y-3">
                <Input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="プレイリスト名"
                  className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500"
                  required
                  autoFocus
                />
                <textarea
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  placeholder="説明（省略可）"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-white placeholder:text-zinc-500"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    {isCreating ? "作成中..." : "作成"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewPlaylistName("");
                      setNewPlaylistDescription("");
                    }}
                    variant="ghost"
                    className="text-zinc-400 hover:text-white"
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-zinc-400">
            <p>読み込み中...</p>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <p>プレイリストがありません</p>
            <p className="text-sm mt-2">
              「新規作成」からプレイリストを作成してください
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer"
                onClick={() => router.push(`/playlists/${playlist.id}`)}
              >
                <CardContent className="p-4 lg:p-6">
                  <div className="aspect-square bg-linear-to-br from-violet-600 to-purple-600 rounded-lg mb-4 flex items-center justify-center">
                    <List className="h-12 w-12 lg:h-16 lg:w-16 text-white" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base lg:text-lg">
                      {playlist.name}
                    </h3>
                    {playlist.is_default && (
                      <span className="px-2 py-0.5 text-xs bg-blue-900/50 text-blue-300 rounded">
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
                  {!playlist.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist.id, playlist.name);
                      }}
                      className="mt-3 w-full text-red-400 hover:text-red-300 hover:bg-red-950"
                    >
                      削除
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* 新規作成カード */}
            <Card
              className="bg-zinc-900 border-zinc-800 border-dashed hover:bg-zinc-800 transition-colors cursor-pointer"
              onClick={() => setShowCreateForm(true)}
            >
              <CardContent className="p-4 lg:p-6 h-full flex flex-col items-center justify-center text-center min-h-[200px]">
                <Plus className="h-10 w-10 lg:h-12 lg:w-12 text-zinc-600 mb-2" />
                <p className="text-zinc-400 text-sm lg:text-base">新規作成</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
