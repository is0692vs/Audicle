"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

import type { Bookmark } from "@/types/playlist";

interface ArticleCardProps {
  article: Bookmark;
  onArticleClick: (article: Bookmark) => void;
  onPlaylistAdd: (articleId: string) => void;
  onDelete: (articleId: string) => void;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

export function ArticleCard({
  article,
  onArticleClick,
  onPlaylistAdd,
  onDelete,
}: ArticleCardProps) {
  return (
    <Card
      className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer"
      onClick={() => onArticleClick(article)}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg lg:text-xl font-semibold text-white mb-2 truncate">
              {article.article_title}
            </h3>
            <p className="text-sm text-zinc-400 mb-3 truncate">
              {extractDomain(article.article_url)}
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>
                {new Date(article.created_at).toLocaleDateString("ja-JP", {
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
                onPlaylistAdd(article.id);
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
                onDelete(article.id);
              }}
              className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
