"use client";

import { useRouter } from "next/navigation";
import StorageManager from "@/components/StorageManager";
import UserSettingsPanel from "@/components/UserSettingsPanel";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              ← 記事一覧
            </button>
            <h2 className="text-2xl lg:text-3xl font-bold">設定</h2>
          </div>
        </div>
        <p className="text-sm lg:text-base text-zinc-400">
          再生設定をカスタマイズ
        </p>
      </div>

      {/* Content */}
      <div className="max-w-2xl space-y-6">
        <UserSettingsPanel />
        <StorageManager />
      </div>
    </div>
  );
}
