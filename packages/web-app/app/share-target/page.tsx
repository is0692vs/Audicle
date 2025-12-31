import { Suspense } from "react";
import ShareTargetClient from "./ShareTargetClient";

/**
 * Web Share Target APIのエントリーポイント
 * スマホのChromeで「共有」→「Audicle」を選択すると、このページが開かれる
 */
export default function ShareTargetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <ShareTargetClient />
    </Suspense>
  );
}
