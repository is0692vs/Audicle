"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { handleSignOut } from "@/app/auth/signin/actions";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { PlaylistSelectorModal } from "@/components/PlaylistSelectorModal";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, ExternalLink } from "lucide-react";
import type { Bookmark, PlaylistWithItems } from "@/types/playlist";

export default function Home() {
  const router = useRouter();
  const [articles, setArticles] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(
    null
  );
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedBookmarkId),
    [articles, selectedBookmarkId]
  );
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

  const handleLoadArticle = () => {
    if (urlInput.trim()) {
      router.push(`/reader?url=${encodeURIComponent(urlInput)}`);
    }
  };

  return (
    <AppLayout>
      {confirmDialog}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold mb-2">記事一覧</h2>
          <p className="text-sm lg:text-base text-zinc-400">
            URLを入力して記事を読み込んでください
          </p>
        </div>

        <Card className="bg-zinc-900 border-zinc-800 mb-6 lg:mb-8">
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="記事のURLを入力してください"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLoadArticle();
                  }
                }}
                className="flex-1 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500"
              />
              <Button
                className="bg-violet-600 hover:bg-violet-700 sm:w-auto w-full"
                onClick={handleLoadArticle}
              >
                読込
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-zinc-400">
            <p>読み込み中...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <p>まだ記事がありません</p>
            <p className="text-sm mt-2">
              上部のフォームから記事を追加してください
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {articles.map((article) => (
              <Card
                key={article.id}
                className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer group"
                onClick={() =>
                  router.push(
                    `/reader?url=${encodeURIComponent(article.article_url)}`
                  )
                }
              >
                <CardContent className="p-4 lg:p-6">
                  <div className="flex gap-4 lg:gap-6">
                    <div className="hidden sm:block shrink-0">
                      <div className="w-16 h-16 lg:w-24 lg:h-24 bg-linear-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                        <BookOpen className="h-6 w-6 lg:h-10 lg:w-10 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base lg:text-lg mb-2 line-clamp-2 group-hover:text-violet-400 transition-colors">
                        {article.article_title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(article.created_at)}
                        </span>
                        {article.last_read_position !== undefined &&
                          article.last_read_position > 0 && (
                            <span>読書位置: {article.last_read_position}</span>
                          )}
                        <a
                          href={article.article_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-violet-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="hidden sm:inline">元記事を開く</span>
                          <span className="sm:hidden">元記事</span>
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBookmarkId(article.id);
                          setIsPlaylistModalOpen(true);
                        }}
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-950"
                        title="プレイリストに追加"
                      >
                        📋
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(article.id);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950"
                        title="削除"
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* プレイリストセレクターモーダル */}
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
    </AppLayout>
  );
}
