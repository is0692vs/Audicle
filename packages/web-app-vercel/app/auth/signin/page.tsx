"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { handleGoogleSignIn } from "./actions";

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // ALLOWED_USERS環境変数の値を取得（セキュリティ上、最初の3文字のみ表示）
  const allowedUsersPreview =
    process.env.NEXT_PUBLIC_DEBUG_MODE === "true"
      ? process.env.NEXT_PUBLIC_ALLOWED_USERS_PREVIEW || "Not configured"
      : "Hidden (enable DEBUG_MODE to view)";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-600 bg-clip-text text-transparent">
            Audicle
          </h2>
          <p className="mt-2 text-zinc-400">Web記事読み上げアプリ</p>
        </div>

        {error && (
          <div className="p-4 bg-red-950/30 border border-red-800 rounded">
            <p className="text-red-400 text-sm">
              <strong>エラーが発生しました:</strong> {error}
            </p>
          </div>
        )}

        <form action={handleGoogleSignIn}>
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 transition-colors"
          >
            Googleでログイン
          </button>
        </form>

        {/* デバッグ情報セクション */}
        {process.env.NEXT_PUBLIC_DEBUG_MODE === "true" && (
          <div className="mt-8 pt-8 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-400 mb-4">
              🔍 デバッグ情報（開発環境）
            </h3>
            <div className="bg-zinc-950 p-4 rounded text-left text-xs space-y-2 border border-zinc-800">
              <div>
                <p className="text-zinc-400">
                  <strong>許可されたメール前缀:</strong> {allowedUsersPreview}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">
                  <strong>現在時刻:</strong>{" "}
                  {new Date().toLocaleString("ja-JP")}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">
                  <strong>ユーザーエージェント:</strong>{" "}
                  {typeof navigator !== "undefined"
                    ? navigator.userAgent.substring(0, 50) + "..."
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black p-4">
          <div className="max-w-md w-full space-y-8 p-8 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
            <div className="text-center">
              <p className="text-zinc-400">読み込み中...</p>
            </div>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
