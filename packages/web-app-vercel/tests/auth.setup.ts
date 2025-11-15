import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
    // ローカルサーバーのトップページに移動
    await page.goto('http://localhost:3000')

    // 手動でGoogleログインを実行するため一時停止
    // ターミナルに表示される指示に従ってブラウザでログイン
    console.log('Please login manually in the browser...')
    await page.pause()

    // ログイン完了後，認証状態を保存
    await page.context().storageState({ path: authFile })

    console.log('Authentication state saved to', authFile)
})