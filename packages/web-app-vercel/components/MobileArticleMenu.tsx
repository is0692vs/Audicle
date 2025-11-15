"use client";

import { useState, useEffect } from "react";
import {
  MoreVertical,
  ExternalLink,
  Download,
  Link as LinkIcon,
} from "lucide-react";

interface MobileArticleMenuProps {
  articleUrl: string;
  onDownload: () => void;
  isDownloading?: boolean;
}

export function MobileArticleMenu({
  articleUrl,
  onDownload,
  isDownloading = false,
}: MobileArticleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCopiedNotification, setShowCopiedNotification] = useState(false);

  // Escapeキーでメニューを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl);
      setShowCopiedNotification(true);
      setTimeout(() => {
        setShowCopiedNotification(false);
      }, 2000);
    } catch (error) {
      console.error("URLのコピーに失敗しました:", error);
    }
  };

  const handleOpenOriginal = () => {
    window.open(articleUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const handleDownload = () => {
    onDownload();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* メニュートグルボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="メニューを開く"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="size-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <>
          {/* 背景オーバーレイ */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* メニュー本体 */}
          <div
            className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50"
            role="menu"
          >
            <div className="py-1">
              <button
                onClick={handleOpenOriginal}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                role="menuitem"
              >
                <ExternalLink className="size-4 text-gray-600 dark:text-gray-400" />
                <span>元記事を開く</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                role="menuitem"
              >
                <Download className="size-4 text-gray-600 dark:text-gray-400" />
                <span>
                  {isDownloading ? "ダウンロード中..." : "全文をダウンロード"}
                </span>
              </button>

              <button
                onClick={handleCopyUrl}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                role="menuitem"
              >
                <LinkIcon className="size-4 text-gray-600 dark:text-gray-400" />
                <span>URLをコピー</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* コピー完了通知 */}
      {showCopiedNotification && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-600 text-white text-sm rounded-lg shadow-lg">
          URLをコピーしました
        </div>
      )}
    </div>
  );
}
