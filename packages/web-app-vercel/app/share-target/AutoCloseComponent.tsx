"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoCloseComponentProps {
  articleTitle: string;
}

export function AutoCloseComponent({ articleTitle }: AutoCloseComponentProps) {
  const router = useRouter();

  useEffect(() => {
    // 1秒待機してから自動的に閉じる
    const timer = setTimeout(() => {
      // PWAウィンドウを閉じようと試みる
      window.close();
      
      // window.close()が機能しない場合（一部のブラウザでは制限される）、
      // ホームページにリダイレクト
      setTimeout(() => {
        router.push('/');
      }, 500);
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="text-center text-white max-w-md px-4">
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">追加しました</h1>
        <p className="text-zinc-400 mb-4">
          {articleTitle}
        </p>
        <p className="text-sm text-zinc-500">
          読み込みプレイリストに追加されました
        </p>
        <p className="text-xs text-zinc-600 mt-4">
          このウィンドウは自動的に閉じます
        </p>
      </div>
    </div>
  );
}
