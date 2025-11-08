"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { List, Plus, Menu, X, Home, Settings } from "lucide-react";
import type { PlaylistWithItems } from "@/types/playlist";

type PlaylistSortBy = "newest" | "oldest" | "name" | "count";

export default function PlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<PlaylistSortBy>("newest");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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
    <div className="h-screen flex bg-black text-white overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-black border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-violet-400 to-purple-600 bg-clip-text text-transparent">
              Audicle
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Web記事読み上げアプリ</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <button
            onClick={() => {
              router.push("/");
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">ホーム</span>
          </button>

          <button
            onClick={() => {
              router.push("/playlists");
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800 text-white"
          >
            <List className="h-5 w-5" />
            <span className="font-medium">プレイリスト</span>
          </button>

          <button
            onClick={() => {
              router.push("/settings");
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">設定</span>
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => router.push("/reader")}
          >
            <Plus className="h-4 w-4 mr-2" />
            新しい記事を読む
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-black">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold">Audicle</h2>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto bg-linear-to-b from-zinc-900 to-black">
          <div className="p-4 sm:p-6 lg:p-8">
            {confirmDialog}

            {/* Page Header */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl lg:text-3xl font-bold">
                    プレイリスト
                  </h2>
                  <Select
                    value={sortBy}
                    onValueChange={(value) =>
                      setSortBy(value as PlaylistSortBy)
                    }
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
                    <h3 className="text-lg font-bold mb-4">
                      新しいプレイリスト
                    </h3>
                    <div className="space-y-3">
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
                          disabled={isCreating}
                          className="bg-violet-600 hover:bg-violet-700"
                        >
                          {isCreating ? "作成中..." : "作成"}
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
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedPlaylists.map((playlist) => (
                  <Card
                    key={playlist.id}
                    className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/playlists/${playlist.id}`)}
                  >
                    <CardContent className="p-4 lg:p-6">
                      <div className="aspect-square bg-linear-to-br from-violet-600 to-purple-600 rounded-lg mb-4 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <List className="size-12 lg:size-16 text-white" />
                      </div>
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

                      {/* Delete Button */}
                      {!playlist.is_default && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlaylist(playlist.id, playlist.name);
                          }}
                          className="mt-3 w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        >
                          削除
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Create New Card */}
                <Card
                  className="bg-zinc-900 border-zinc-800 border-dashed hover:bg-zinc-800 transition-colors cursor-pointer"
                  onClick={() => setShowCreateForm(true)}
                >
                  <CardContent className="p-4 lg:p-6 h-full flex flex-col items-center justify-center text-center min-h-[250px]">
                    <Plus className="size-10 lg:size-12 text-zinc-600 mb-2" />
                    <p className="text-zinc-400 text-sm lg:text-base">
                      新規作成
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
