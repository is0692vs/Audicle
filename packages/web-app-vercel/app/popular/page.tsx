"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { PeriodFilter } from "@/components/PeriodFilter";
import { PopularArticleCard } from "@/components/PopularArticleCard";
import { Button } from "@/components/ui/button";
import type {
  Period,
  PopularArticlesResponse,
  PopularArticle,
} from "@/types/stats";
import { RotateCcw } from "lucide-react";

export default function PopularPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("week");
  const [articles, setArticles] = useState<PopularArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPopularArticles = async (selectedPeriod: Period) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/stats/popular?period=${selectedPeriod}&limit=20`
      );
      if (!response.ok) {
        throw new Error("人気記事の取得に失敗しました");
      }

      const data: PopularArticlesResponse = await response.json();
      setArticles(data.articles);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました"
      );
      console.error("Error fetching popular articles:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPopularArticles(period);
  }, [period]);

  const handleRead = (url: string) => {
    router.push(`/reader?url=${encodeURIComponent(url)}`);
  };

  const handleRefresh = () => {
    fetchPopularArticles(period);
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-b from-zinc-900 to-black">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl lg:text-3xl font-bold">人気記事</h2>
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
            <p className="text-sm lg:text-base text-zinc-400 mb-4">
              期間別に人気の記事をランキング表示します
            </p>

            {/* Period Filter */}
            <PeriodFilter activePeriod={period} onPeriodChange={setPeriod} />
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-12 text-zinc-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4" />
              <p className="text-lg">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                エラーが発生しました
              </h3>
              <p className="text-zinc-400 mb-6">{error}</p>
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
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                データがありません
              </h3>
              <p className="text-zinc-400 mb-6">
                この期間の人気記事データはまだありません
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8">
              {articles.map((article) => (
                <PopularArticleCard
                  key={article.articleHash}
                  article={article}
                  onRead={handleRead}
                />
              ))}
            </div>
          )}

          {/* Results Summary */}
          {articles.length > 0 && (
            <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center text-zinc-400">
              <p>TOP {articles.length} の記事を表示しています</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
