"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, List, Settings, Plus } from "lucide-react";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { href: "/", label: "ホーム", icon: Home },
    { href: "/playlists", label: "プレイリスト", icon: List },
    { href: "/settings", label: "設定", icon: Settings },
  ];

  const handleLinkClick = () => {
    if (onClose) onClose();
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile header */}
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
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={handleLinkClick}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                pathname === href
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => window.location.href = "/reader"}
          >
            <Plus className="h-4 w-4 mr-2" />
            新しい記事を読む
          </Button>
        </div>
      </aside>
    </>
  );
}