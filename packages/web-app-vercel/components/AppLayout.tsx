"use client";

import { useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, List, Settings, Plus, Menu, X } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <div className="h-screen flex bg-black text-white overflow-hidden">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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
          <button
            onClick={() => {
              router.push("/");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive("/")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">ホーム</span>
          </button>

          <button
            onClick={() => {
              router.push("/playlists");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive("/playlists")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <List className="h-5 w-5" />
            <span className="font-medium">プレイリスト</span>
          </button>

          <button
            onClick={() => {
              router.push("/settings");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive("/settings")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">設定</span>
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => {
              router.push("/reader");
              setSidebarOpen(false);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            新しい記事を読む
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
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
          {children}
        </div>
      </main>
    </div>
  );
}
