"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DomainBadge } from "@/components/DomainBadge";
import type { PopularArticle } from "@/types/stats";

interface PopularArticleCardProps {
  article: PopularArticle;
  onRead: (url: string) => void;
}

export function PopularArticleCard({
  article,
  onRead,
}: PopularArticleCardProps) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-colors">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* タイトル */}
            <h3 className="text-lg lg:text-xl font-semibold text-white mb-3 line-clamp-2">
              {article.title}
            </h3>

            {/* ドメインバッジ */}
            <div className="mb-3">
              <DomainBadge domain={article.domain} />
            </div>

            {/* メタデータ */}
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1">
                <span>👥</span>
                <span>{article.accessCount}回</span>
              </span>
              <span className="flex items-center gap-1">
                <span>📊</span>
                <span>キャッシュ: {Math.round(article.cacheHitRate)}%</span>
              </span>
            </div>
          </div>

          {/* 聴くボタン */}
          <Button
            onClick={() => onRead(article.url)}
            className="bg-violet-600 hover:bg-violet-700 text-white whitespace-nowrap"
            size="sm"
          >
            聴く
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
