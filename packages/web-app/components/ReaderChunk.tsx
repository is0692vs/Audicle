import { memo, forwardRef } from "react";
import { Chunk } from "@/types/api";

interface ReaderChunkProps {
  chunk: Chunk;
  isActive: boolean;
  onClick?: (chunkId: string) => void;
}

export const ReaderChunk = memo(
  forwardRef<HTMLParagraphElement, ReaderChunkProps>(function ReaderChunk(
    { chunk, isActive, onClick },
    ref
  ) {
    return (
      <p
        ref={ref}
        data-audicle-id={chunk.id}
        onClick={() => onClick?.(chunk.id)}
        className={`
          text-lg leading-relaxed cursor-pointer transition-all duration-200 p-4 rounded-lg
          ${
            isActive
              ? "bg-yellow-100 dark:bg-yellow-900/30 font-medium scale-105"
              : "hover:bg-gray-100 dark:hover:bg-gray-900"
          }
        `}
      >
        {chunk.text}
      </p>
    );
  })
);
