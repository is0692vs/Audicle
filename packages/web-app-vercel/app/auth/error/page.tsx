"use client";

import { useSearchParams } from "next/navigation";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // URLパラメータからエラー情報を抽出
  let errorMessage = "アクセスが拒否されました";
  let userEmail = "";

  if (error === "AccessDenied") {
    if (errorDescription) {
      try {
        const decoded = decodeURIComponent(errorDescription);
        if (decoded.includes("ACCESS_DENIED")) {
          const match = decoded.match(/ACCESS_DENIED:\s*(.+)/);
          if (match) {
            userEmail = match[1].trim();
            errorMessage = `このメールアドレスはアクセスできません: ${userEmail}`;
          }
        }
      } catch (_e) {
        // エラーハンドリング
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">{errorMessage}</h2>
          <p className="mt-4 text-gray-600">
            このアプリは許可されたユーザーのみ利用できます．
          </p>

          {/* デバッグ情報セクション */}
          <div className="mt-8 pt-8 border-t border-gray-300">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              🔍 デバッグ情報
            </h3>
            <div className="bg-gray-100 p-4 rounded text-left text-xs space-y-2">
              {userEmail && (
                <div>
                  <p className="text-gray-600">
                    <strong>ログイン試行メール:</strong> {userEmail}
                  </p>
                </div>
              )}
              {error && (
                <div>
                  <p className="text-gray-600">
                    <strong>エラーコード:</strong> {error}
                  </p>
                </div>
              )}
              {errorDescription && (
                <div>
                  <p className="text-gray-600">
                    <strong>詳細:</strong> {errorDescription}
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-600">
                  <strong>タイムスタンプ:</strong>{" "}
                  {new Date().toLocaleString("ja-JP")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <a
            href="/auth/signin"
            className="inline-block py-2 px-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← ログイン画面に戻る
          </a>
        </div>
      </div>
    </div>
  );
}
