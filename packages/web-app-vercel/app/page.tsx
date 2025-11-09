// packages/web-app-vercel/app/page.tsx

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import {
  useBookmarks,
  useDeleteBookmarkMutation,
} from "@/lib/hooks/useBookmarks";
import { PlaylistSelectorModal } from "@/components/PlaylistSelectorModal";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, RotateCcw } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import type { Bookmark } from "@/types/playlist";

type ArticleSortBy = "newest" | "oldest" | "title";

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: articles = [], isLoading, error } = useBookmarks();
  const deleteBookmarkMutation = useDeleteBookmarkMutation();

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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
  };

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
        await deleteBookmarkMutation.mutateAsync(id);
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
    <div className="h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-b from-zinc-900 to-black">
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
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="icon"
                title="手動更新"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
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
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                エラーが発生しました
              </h3>
              <p className="text-zinc-400 mb-6">
                {error instanceof Error
                  ? error.message
                  : "記事の読み込みに失敗しました"}
              </p>
              <Button
                onClick={handleRefresh}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <RotateCcw className="size-4 mr-2" />
                再試行
              </Button>
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
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8">
              {sortedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onArticleClick={handleArticleClick}
                  onPlaylistAdd={(id) => {
                    setSelectedBookmarkId(id);
                    setIsPlaylistModalOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
