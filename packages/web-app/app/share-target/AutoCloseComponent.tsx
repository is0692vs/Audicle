"use client";

import { useEffect } from "react";

interface AutoCloseComponentProps {
  success: boolean;
  message: string;
}

/**
 * 自動でウィンドウを閉じるコンポーネント
 * 成功時は即座に閉じ、失敗時は3秒後に閉じる
 */
export function AutoCloseComponent({ success, message }: AutoCloseComponentProps) {
  useEffect(() => {
    if (success) {
      // 成功時は即座に閉じる
      const timer = setTimeout(() => {
        window.close();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // 失敗時は3秒後に閉じる
      const timer = setTimeout(() => {
        window.close();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800">
        <div className="text-center">
          {success ? (
            <>
              <div className="mb-4 text-green-600 dark:text-green-400">
                <svg
                  className="w-16 h-16 mx-auto"
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                追加しました
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                このウィンドウは自動的に閉じます...
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 text-red-600 dark:text-red-400">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                エラーが発生しました
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                このウィンドウは3秒後に閉じます...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
