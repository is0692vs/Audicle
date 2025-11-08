"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { handleSignOut } from "@/app/auth/signin/actions";
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
import { Clock, BookOpen, ExternalLink, Plus } from "lucide-react";
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
  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedBookmarkId),
    [articles, selectedBookmarkId]
  );
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
  const { showConfirm, confirmDialog } = useConfirmDialog();

  // 記事一覧を読み込み（デフォルトプレイリストから）
  useEffect(() => {
    const loadArticles = async () => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {confirmDialog}

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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.push("/playlists")}
                className="text-zinc-400 hover:text-white"
              >
                📚 プレイリスト
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push("/settings")}
                className="text-zinc-400 hover:text-white"
              >
                ⚙️ 設定
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push("/reader")}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="size-4 mr-2" />
                新しい記事を読む
              </Button>
              <button
                onClick={() => handleSignOut()}
                className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors"
              >
                ログアウト
              </button>
            </div>
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
        <div className="text-center py-12 text-zinc-500">
          <p className="text-lg">まだ記事がありません</p>
          <p className="text-sm mt-2">
            「新しい記事を読む」から記事を追加してください
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedArticles.map((article) => (
            <Card
              key={article.id}
              className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-colors group"
            >
              <CardContent className="p-4 lg:p-6">
                <div className="flex gap-4 lg:gap-6">
                  {/* Icon */}
                  <div className="hidden sm:block flex-shrink-0">
                    <div className="size-16 lg:size-24 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                      <BookOpen className="size-6 lg:size-10 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/reader?url=${encodeURIComponent(
                            article.article_url
                          )}`
                        )
                      }
                    >
                      <h3 className="font-bold text-base lg:text-lg mb-2 line-clamp-2 group-hover:text-violet-400 transition-colors">
                        {article.article_title}
                      </h3>
                      <p className="text-xs lg:text-sm text-zinc-400 mb-3 line-clamp-1">
                        {article.article_url}
                      </p>
                    </div>

                    {/* Meta & Actions */}
                    <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="size-3" />
                        {formatDate(article.created_at)}
                      </span>
                      {article.last_read_position !== undefined &&
                        article.last_read_position > 0 && (
                          <span className="text-xs text-zinc-500">
                            読書位置: {article.last_read_position}
                          </span>
                        )}
                      <a
                        href={article.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs hover:text-violet-400 transition-colors text-zinc-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3" />
                        <span className="hidden sm:inline">元記事を開く</span>
                        <span className="sm:hidden">元記事</span>
                      </a>

                      {/* Action Buttons */}
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedBookmarkId(article.id);
                            setIsPlaylistModalOpen(true);
                          }}
                          className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-950/30"
                        >
                          <Plus className="size-3 mr-1" />
                          プレイリスト
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(article.id)}
                          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Playlist Selector Modal */}
      {selectedBookmarkId && selectedArticle && (
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
    </div>
  );
}
