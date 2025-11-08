"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StorageManager from "@/components/StorageManager";
import UserSettingsPanel from "@/components/UserSettingsPanel";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, List, Settings, Plus } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex bg-black text-white overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-black border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-violet-400 to-purple-600 bg-clip-text text-transparent">
              Audicle
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Web記事読み上げアプリ</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">ホーム</span>
          </Link>

          <Link
            href="/playlists"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <List className="h-5 w-5" />
            <span className="font-medium">プレイリスト</span>
          </Link>

          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800 text-white"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">設定</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => router.push("/reader")}
          >
            <Plus className="h-4 w-4 mr-2" />
            新しい記事を読む
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-black">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold">Audicle</h2>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto bg-linear-to-b from-zinc-900 to-black">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Page Header */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold">設定</h2>
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
        </div>
      </main>
    </div>
  );
}
