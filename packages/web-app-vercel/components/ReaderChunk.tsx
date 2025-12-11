"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { Chunk } from "@/types/api";

interface ReaderChunkProps {
  chunk: Chunk;
  isActive: boolean;
  onClick?: (chunkId: string) => void;
}

const HEADING_FONT_SIZE_MAP: Record<number, string> = {
  1: "text-3xl",
  2: "text-2xl",
  3: "text-xl",
  4: "text-lg",
  5: "text-base",
  6: "text-sm",
};

const ReaderChunk = memo(function ReaderChunk({
  chunk,
  isActive,
  onClick,
}: ReaderChunkProps) {
  const isHeading = /^h[1-6]$/.test(chunk.type);
  const isListItem = chunk.type === "li";
  const isBlockquote = chunk.type === "blockquote";
  const baseTypography = "text-lg leading-relaxed text-zinc-300";
  let typography: string;
  if (isHeading) {
    const level = parseInt(chunk.type.charAt(1), 10);
    typography = cn(HEADING_FONT_SIZE_MAP[level] ?? "text-xl", "font-semibold");
  } else {
    typography = cn(
      baseTypography,
      isListItem && "ml-6",
      isBlockquote && "border-l-4 border-zinc-700 pl-4 italic"
    );
  }

  return (
    <div
      data-audicle-id={chunk.id}
      onClick={() => onClick?.(chunk.id)}
      className={cn(
        "group cursor-pointer rounded-lg border border-transparent bg-zinc-800/50 px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 hover:border-primary/30 hover:bg-zinc-800",
        isActive ? "border-primary/60 bg-primary/20 ring-2 ring-primary/40" : ""
      )}
    >
      <div
        className={cn(
          "whitespace-pre-wrap text-base sm:text-lg",
          typography,
          isActive && !isHeading ? "font-medium" : undefined
        )}
      >
        {chunk.text}
      </div>
    </div>
  );
});

export default ReaderChunk;
