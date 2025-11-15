"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DomainBadge } from "@/components/DomainBadge";
import { Plus } from "lucide-react";
import type { PopularArticle } from "@/types/stats";

interface PopularArticleCardProps {
  article: PopularArticle;
  onRead: (url: string) => void;
  onPlaylistAdd: (article: PopularArticle) => void;
}

export function PopularArticleCard({
  article,
  onRead,
  onPlaylistAdd,
}: PopularArticleCardProps) {
  return (
    <Card
      className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer"
      onClick={() => onRead(article.url)}
      data-testid="article-card"
    >
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
              <span
                className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs"
                data-testid="cache-badge"
              >
                キャッシュ済み
              </span>
            </div>
          </div>

          {/* プレイリスト追加ボタン */}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onPlaylistAdd(article);
            }}
            className="text-violet-400 hover:text-violet-300 hover:bg-violet-950/30"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
