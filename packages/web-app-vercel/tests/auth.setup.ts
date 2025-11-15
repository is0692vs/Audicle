import { test as setup } from '@playwright/test'
import fs from 'fs'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
    // 既に認証状態ファイルが存在する場合はスキップ
    if (fs.existsSync(authFile)) {
        console.log('[AUTH SETUP] Using existing auth state from', authFile)
        return
    }

    console.log('[AUTH SETUP] Creating new auth state...')

    // 診断ログ追加
    console.log('[SETUP DIAGNOSTIC] NODE_ENV:', process.env.NODE_ENV)
    console.log('[SETUP DIAGNOSTIC] TEST_USER_EMAIL:', process.env.TEST_USER_EMAIL)
    console.log('[SETUP DIAGNOSTIC] TEST_USER_PASSWORD:', process.env.TEST_USER_PASSWORD ? 'SET' : 'NOT SET')

    await page.goto('http://localhost:3000/auth/signin')

    // Credentials Providerのフォームを探す
    await page.waitForSelector('input[type="email"]', { timeout: 10000 })

    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!)
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!)

    // フォーム内の「ログイン」ボタンをクリック
    await page.getByRole('button', { name: 'ログイン', exact: true }).click()

    // ネットワークアイドルを待つ
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // ログイン完了を待機
    await page.waitForURL(/\/(?!auth).*/, { timeout: 10000 })

    // もう一度ネットワークアイドルを待つ
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // 認証状態を保存
    await page.context().storageState({ path: authFile })

    console.log('[AUTH SETUP] Authentication state saved to', authFile)
})