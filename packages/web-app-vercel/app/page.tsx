"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { PlaylistSelectorModal } from "@/components/PlaylistSelectorModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import type { Bookmark, PlaylistWithItems } from "@/types/playlist";

type ArticleSortBy = "newest" | "oldest" | "title";

export default function Home() {
  const router = useRouter();
  const [articles, setArticles] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<ArticleSortBy>("newest");
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(
    null
  );
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const sortedArticles = useMemo(() => {
    return [...articles].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "title":
          return a.article_title.localeCompare(b.article_title);
        default:
          return 0;
      }
    });
  }, [articles, sortBy]);
  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedBookmarkId),
    [articles, selectedBookmarkId]
  );
  const { showConfirm, confirmDialog } = useConfirmDialog();

  // 記事一覧を読み込み（デフォルトプレイリストから）
  useEffect(() => {
    const loadArticles = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/playlists/default");

        if (!response.ok) {
          throw new Error("プレイリストの取得に失敗しました");
        }

        const playlist: PlaylistWithItems = await response.json();
        const bookmarks = playlist.items?.map((item) => item.bookmark) || [];

        logger.info("記事一覧を読み込み", { count: bookmarks.length });
        setArticles(bookmarks);
      } catch (error) {
        logger.error("記事一覧の読み込みに失敗", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticles();

    // storageイベントをリッスン (他のタブでの変更を検知)
    window.addEventListener("storage", loadArticles);
    return () => window.removeEventListener("storage", loadArticles);
  }, []);

  const handleDelete = async (id: string) => {
    const article = articles.find((a) => a.id === id);
    if (!article) return;

    const confirmed = await showConfirm({
      title: "記事を削除",
      message: `「${article.article_title}」を削除しますか?`,
      confirmText: "削除",
      cancelText: "キャンセル",
      isDangerous: true,
    });

    if (confirmed) {
      try {
        const response = await fetch(`/api/bookmarks/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("削除に失敗しました");
        }

        setArticles((prev) => prev.filter((a) => a.id !== id));
        logger.success("記事を削除", { id, title: article.article_title });
      } catch (error) {
        logger.error("記事の削除に失敗", error);
      }
    }
  };

  const handleArticleClick = (article: Bookmark) => {
    router.push(`/reader?url=${encodeURIComponent(article.article_url)}`);
  };

  return (
    <div className="h-screen bg-black text-white overflow-auto">
      <Sidebar />

      <main className="lg:ml-64 flex flex-col">
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-zinc-900 to-black">
          <div className="p-4 sm:p-6 lg:p-8">
            {confirmDialog}

            {selectedArticle && selectedBookmarkId && (
              <PlaylistSelectorModal
                isOpen={isPlaylistModalOpen}
                onClose={() => {
                  setIsPlaylistModalOpen(false);
                  setSelectedBookmarkId(null);
                }}
                bookmarkId={selectedBookmarkId}
                articleTitle={selectedArticle.article_title}
              />
            )}

            {/* Page Header */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl lg:text-3xl font-bold">記事一覧</h2>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as ArticleSortBy)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="ソート" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">新しい順</SelectItem>
                      <SelectItem value="oldest">古い順</SelectItem>
                      <SelectItem value="title">タイトル順</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm lg:text-base text-zinc-400">
                読み込んだ記事の一覧です
              </p>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="text-center py-12 text-zinc-500">
                <p className="text-lg">読み込み中...</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  記事がありません
                </h3>
                <p className="text-zinc-400 mb-6">
                  新しい記事を読み込んでみましょう
                </p>
                <Button
                  onClick={() => router.push("/reader")}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Plus className="size-4 mr-2" />
                  新しい記事を読む
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 lg:gap-8">
                {sortedArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    onClick={() => handleArticleClick(article)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg lg:text-xl font-semibold text-white mb-2 line-clamp-2">
                            {article.article_title}
                          </h3>
                          <p className="text-sm text-zinc-400 mb-3 line-clamp-1">
                            {article.article_url}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>
                              {new Date(article.created_at).toLocaleDateString(
                                "ja-JP",
                                { timeZone: "UTC" }
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBookmarkId(article.id);
                              setIsPlaylistModalOpen(true);
                            }}
                            className="text-violet-400 hover:text-violet-300 hover:bg-violet-950/30"
                          >
                            <Plus className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(article.id);
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
