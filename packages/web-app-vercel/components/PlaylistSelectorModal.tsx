"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import type { Playlist } from "@/types/playlist";

interface PlaylistSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarkId: string;
  articleTitle: string;
}

export function PlaylistSelectorModal({
  isOpen,
  onClose,
  bookmarkId,
  articleTitle,
}: PlaylistSelectorModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    new Set()
  );
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開いたときにプレイリスト一覧と現在の関連プレイリストを読み込み
  const loadPlaylistsAndCurrentItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // ユーザーのプレイリスト一覧取得と現在のブックマークが含まれるプレイリストを並列で取得
      const [playlistsResponse, currentPlaylistsResponse] = await Promise.all([
        fetch("/api/playlists"),
        fetch(`/api/bookmarks/${bookmarkId}/playlists`),
      ]);

      if (!playlistsResponse.ok) {
        throw new Error("プレイリストの取得に失敗しました");
      }
      const playlistsData: Playlist[] = await playlistsResponse.json();
      setPlaylists(playlistsData);

      // 現在のブックマークが含まれるプレイリストを取得
      let selectedCount = 0;
      if (currentPlaylistsResponse.ok) {
        const currentPlaylists: Playlist[] =
          await currentPlaylistsResponse.json();
        const currentIds = new Set(currentPlaylists.map((p) => p.id));
        setSelectedPlaylistIds(currentIds);
        setInitialSelectedIds(currentIds);
        selectedCount = currentIds.size;
      } else {
        // 取得に失敗した場合、選択は空として扱う
        setSelectedPlaylistIds(new Set());
        setInitialSelectedIds(new Set());
      }

      logger.info("プレイリストを読み込み", {
        totalCount: playlistsData.length,
        selectedCount: selectedCount,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "エラーが発生しました";
      setError(errorMessage);
      logger.error("プレイリストの読み込みに失敗", err);
    } finally {
      setIsLoading(false);
    }
  }, [bookmarkId]);

  useEffect(() => {
    if (isOpen && bookmarkId) {
      loadPlaylistsAndCurrentItems();
    }
  }, [isOpen, bookmarkId, loadPlaylistsAndCurrentItems]);

  // Handle Escape key to close modal for accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Esc") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);
  const handleTogglePlaylist = (playlistId: string) => {
    const newSelected = new Set(selectedPlaylistIds);
    if (newSelected.has(playlistId)) {
      newSelected.delete(playlistId);
    } else {
      newSelected.add(playlistId);
    }
    setSelectedPlaylistIds(newSelected);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // 既存の関連プレイリストと新しい選択を比較
      const currentPlaylistIds = initialSelectedIds;

      // 追加するプレイリスト（新しく選択されたもの）
      const addToPlaylistIds = Array.from(selectedPlaylistIds).filter(
        (id) => !currentPlaylistIds.has(id)
      );

      // 削除するプレイリスト（チェックが外されたもの）
      const removeFromPlaylistIds = Array.from(currentPlaylistIds).filter(
        (id) => !selectedPlaylistIds.has(id)
      );

      // バルク更新API呼び出し
      if (addToPlaylistIds.length > 0 || removeFromPlaylistIds.length > 0) {
        const response = await fetch("/api/playlists/bulk-update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookmarkId,
            addToPlaylistIds,
            removeFromPlaylistIds,
          }),
        });

        if (!response.ok) {
          throw new Error("プレイリストの更新に失敗しました");
        }
      }

      logger.success("プレイリストを更新", {
        bookmarkId,
        addCount: addToPlaylistIds.length,
        removeCount: removeFromPlaylistIds.length,
      });

      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "エラーが発生しました";
      setError(errorMessage);
      logger.error("プレイリストの更新に失敗", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        role="presentation"
      />

      {/* モーダル */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="playlist-selector-modal-title"
        >
          {/* ヘッダー */}
          <div className="border-b border-gray-200 dark:border-gray-800 p-6">
            <h2
              id="playlist-selector-modal-title"
              className="text-xl font-bold text-gray-900 dark:text-gray-100"
            >
              プレイリストに追加
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
              {articleTitle}
            </p>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border border-blue-300 border-t-blue-600" />
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>プレイリストがありません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {playlists.map((playlist) => {
                  const checkboxId = `playlist-checkbox-${playlist.id}`;
                  return (
                    <div
                      key={playlist.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <input
                        id={checkboxId}
                        type="checkbox"
                        checked={selectedPlaylistIds.has(playlist.id)}
                        onChange={() => handleTogglePlaylist(playlist.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                        disabled={isSaving}
                      />
                      <label
                        htmlFor={checkboxId}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {playlist.name}
                        </p>
                        {playlist.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {playlist.description}
                          </p>
                        )}
                        {playlist.is_default && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            デフォルト
                          </p>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving && (
                <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent" />
              )}
              {isSaving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
