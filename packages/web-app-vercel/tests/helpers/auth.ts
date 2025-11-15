import { BrowserContext } from '@playwright/test'

// 認証状態はplaywright.configで自動的に読み込まれるため，
// このヘルパーは現在不要です．
// 将来的に追加の認証ロジックが必要になった場合のために残しておきます．
export async function setupAuthSession(context: BrowserContext) {
    // 何もしない - 認証状態はグローバルに設定されている
}