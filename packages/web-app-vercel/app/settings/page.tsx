"use client";

import { useRouter } from "next/navigation";
import StorageManager from "@/components/StorageManager";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ヘッダー */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              ← 記事一覧
            </button>
            <h1 className="text-2xl font-bold">設定</h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto">
        <StorageManager />
      </main>
    </div>
  );
}
