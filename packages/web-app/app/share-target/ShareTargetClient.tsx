"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { extractContent } from "@/lib/api";
import { articleStorage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { Chunk } from "@/types/api";
import { AutoCloseComponent } from "./AutoCloseComponent";

/**
 * Web Share Target APIのクライアントコンポーネント
 * URLパラメータから記事を取得し、自動的にプレイリストに追加する
 */
export default function ShareTargetClient() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");

  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const addArticle = async () => {
      // URLが指定されていない場合
      if (!url) {
        logger.error("URLが指定されていません");
        setSuccess(false);
        setMessage("URLが指定されていません");
        setProcessing(false);
        return;
      }

      try {
        logger.info("共有URLから記事を追加", { url });

        // 記事の本文を抽出
        const response = await extractContent(url);

        // chunksにIDを付与
        const chunksWithId: Chunk[] = response.chunks.map((text, index) => ({
          id: `chunk-${index}`,
          text,
        }));

        // 記事を保存
        const newArticle = articleStorage.add({
          url,
          title: response.title,
          chunks: chunksWithId,
        });

        logger.success("記事をプレイリストに追加", {
          id: newArticle.id,
          title: newArticle.title,
        });

        setSuccess(true);
        setMessage(`「${response.title}」をプレイリストに追加しました`);
      } catch (err) {
        logger.error("記事の追加に失敗", err);
        setSuccess(false);
        setMessage(
          err instanceof Error ? err.message : "記事の追加に失敗しました"
        );
      } finally {
        setProcessing(false);
      }
    };

    addArticle();
  }, [url]);

  // 処理中の表示
  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md w-full p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <div className="mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              記事を追加中...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {url ? `${url.substring(0, 50)}...` : ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 処理完了後、自動で閉じる
  return <AutoCloseComponent success={success} message={message} />;
}
