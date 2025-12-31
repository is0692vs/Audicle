"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams?.get("message") || "エラーが発生しました";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="text-center text-white">
        <p className="text-xl">エラーが発生しました</p>
        <p className="text-zinc-400 mt-2">{message}</p>
        <a
          href="/"
          className="mt-4 inline-block text-blue-400 hover:text-blue-300"
        >
          ホームに戻る
        </a>
      </div>
    </div>
  );
}

export default function ShareTargetErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-900">
          <div className="text-center text-white">
            <p className="text-xl">読み込み中...</p>
          </div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
