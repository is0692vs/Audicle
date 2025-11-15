"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { extractDomain } from "@/lib/utils";
import type { PlaylistItemWithArticle } from "@/types/playlist";

interface ArticleCardProps {
  item: PlaylistItemWithArticle;
  onArticleClick: (item: PlaylistItemWithArticle) => void;
  onPlaylistAdd: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}

export function ArticleCard({
  item,
  onArticleClick,
  onPlaylistAdd,
  onRemove,
}: ArticleCardProps) {
  return (
    <Card
      className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer"
      onClick={() => onArticleClick(item)}
      data-testid="playlist-article"
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg lg:text-xl font-semibold text-white mb-2 truncate">
              {item.article.title}
            </h3>
            <p className="text-sm text-zinc-400 mb-3 truncate">
              {extractDomain(item.article.url)}
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>
                {new Date(item.added_at).toLocaleDateString("ja-JP", {
                  timeZone: "UTC",
                })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onPlaylistAdd(item.article_id);
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
                onRemove(item.id);
              }}
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-950/30"
            >
              <Minus className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
