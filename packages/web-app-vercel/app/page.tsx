"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { handleSignOut } from "@/app/auth/signin/actions";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Menu,
  X,
  Home as HomeIcon,
  List,
  Settings,
  Trash2,
} from "lucide-react";
import type { Bookmark, PlaylistWithItems } from "@/types/playlist";

type ArticleSortBy = "newest" | "oldest" | "title";

export default function Home() {
  const router = useRouter();
  const [articles, setArticles] = useState<Bookmark[]>([]);
  const [sortBy, setSortBy] = useState<ArticleSortBy>("newest");
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const handleDeleteArticle = async (id: string) => {
    await handleDelete(id);
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
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800 text-white"
          >
            <HomeIcon className="h-5 w-5" />
            <span className="font-medium">ホーム</span>
          </Link>

          <Link
            href="/playlists"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <List className="h-5 w-5" />
            <span className="font-medium">プレイリスト</span>
          </Link>

          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">設定</span>
          </Link>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSignOut()}
                    className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors"
                  >
                    ログアウト
                  </button>
                </div>
              </div>
              <p className="text-sm lg:text-base text-zinc-400">
                読み込んだ記事の一覧です
              </p>
            </div>

            {/* Articles Grid */}
            <div className="grid gap-4 sm:gap-6 lg:gap-8">
              {sortedArticles.map((article) => (
                <Card
                  key={article.id}
                  className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  onClick={() => handleArticleClick(article)}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
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
                              "ja-JP"
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
                            handleDeleteArticle(article.id);
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

            {sortedArticles.length === 0 && (
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
