"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DomainBadge } from "@/components/DomainBadge";
import { Clock, Users } from "lucide-react";
import type { PopularArticle } from "@/types/stats";

interface PopularArticleCardProps {
  article: PopularArticle;
  onRead: (url: string) => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const secondsDiff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsDiff < 60) return "今";
  if (secondsDiff < 3600) return `${Math.floor(secondsDiff / 60)}分前`;
  if (secondsDiff < 86400) return `${Math.floor(secondsDiff / 3600)}時間前`;
  if (secondsDiff < 604800) return `${Math.floor(secondsDiff / 86400)}日前`;

  return date.toLocaleDateString("ja-JP");
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
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              {/* アクセス数 */}
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{article.accessCount.toLocaleString()}回</span>
              </div>

              {/* 最終アクセス */}
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{formatRelativeTime(article.lastAccessedAt)}</span>
              </div>

              {/* キャッシュヒット率 */}
              <div className="flex items-center gap-1.5">
                <span>
                  キャッシュ: {Math.round(article.cacheHitRate * 100)}%
                </span>
              </div>
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
