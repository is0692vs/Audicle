"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { handleSignOut } from "@/app/auth/signin/actions";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { PlaylistSelectorModal } from "@/components/PlaylistSelectorModal";
import type { Bookmark, PlaylistWithItems } from "@/types/playlist";

export default function Home() {
  const router = useRouter();
  const [articles, setArticles] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(
    null
  );
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {confirmDialog}
      {/* ヘッダー */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Audicle - 記事一覧</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/playlists")}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                📚 プレイリスト
              </button>
              <button
                onClick={() => router.push("/settings")}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                ⚙️ 設定
              </button>
              <button
                onClick={() => handleSignOut()}
                className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors border border-red-200 dark:border-red-800"
              >
                ログアウト
              </button>
            </div>
          </div>
          <button
            onClick={() => router.push("/reader")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 新しい記事を読む
          </button>
        </div>
      </header>

      {/* メインコンテンツ: 記事一覧 */}
      <main className="max-w-4xl mx-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>読み込み中...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>まだ記事がありません</p>
            <p className="text-sm mt-2">
              「+ 新しい記事を読む」から記事を追加してください
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <div
                key={article.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/reader?url=${encodeURIComponent(article.article_url)}`
                      )
                    }
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {article.article_title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {article.article_url}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>{formatDate(article.created_at)}</span>
                      {article.last_read_position !== undefined &&
                        article.last_read_position > 0 && (
                          <span>読書位置: {article.last_read_position}</span>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedBookmarkId(article.id);
                        setIsPlaylistModalOpen(true);
                      }}
                      className="px-3 py-1 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 rounded transition-colors"
                      title="プレイリストに追加"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                      title="削除"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* プレイリストセレクターモーダル */}
      {selectedBookmarkId && (
        <PlaylistSelectorModal
          isOpen={isPlaylistModalOpen}
          onClose={() => {
            setIsPlaylistModalOpen(false);
            setSelectedBookmarkId(null);
          }}
          bookmarkId={selectedBookmarkId}
          articleUrl={
            articles.find((a) => a.id === selectedBookmarkId)?.article_url || ""
          }
          articleTitle={
            articles.find((a) => a.id === selectedBookmarkId)?.article_title ||
            ""
          }
        />
      )}
    </div>
  );
}
