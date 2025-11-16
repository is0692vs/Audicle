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

    // ネットワークリクエストを監視（ログインボタンクリックの前に設定）
    page.on('request', request => {
        if (request.url().includes('/api/auth')) {
            console.log('[AUTH SETUP] Auth API request:', request.method(), request.url())
        }
    })

    page.on('response', async response => {
        if (response.url().includes('/api/auth')) {
            console.log('[AUTH SETUP] Auth API response:', response.status(), response.url())
            const body = await response.text().catch(() => 'Could not read body')
            console.log('[AUTH SETUP] Response body:', body)
        }
    })

    // Credentials Providerのフォームを探す
    await page.waitForSelector('input[type="email"]', { timeout: 10000 })

    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!)
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!)

    // ログインボタンの状態を確認
    const loginButton = page.getByRole('button', { name: 'ログイン', exact: true })
    console.log('[AUTH SETUP] Login button found:', await loginButton.count() > 0)
    console.log('[AUTH SETUP] Login button is visible:', await loginButton.isVisible())
    console.log('[AUTH SETUP] Login button is enabled:', await loginButton.isEnabled())

    // ログインボタンをクリック
    console.log('[AUTH SETUP] Clicking login button...')
    await loginButton.click()

    // クリック後に少し待つ
    await page.waitForTimeout(2000)

    console.log('[AUTH SETUP] After click - URL:', page.url())

    // ネットワークアイドルを待つ
    console.log('[AUTH SETUP] Waiting for network idle...')
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // 現在のURLを確認
    console.log('[AUTH SETUP] Current URL after login:', page.url())

    // ページのタイトルを確認
    console.log('[AUTH SETUP] Page title after login:', await page.title())

    // エラーメッセージがあるか確認
    const errorText = await page.locator('text=/エラー|error|失敗|failed/i').textContent().catch(() => null)
    if (errorText) {
        console.log('[AUTH SETUP] Error message found:', errorText)
    }

    // ログイン後のURL確認
    console.log('[AUTH SETUP] Current URL after login:', page.url())
    console.log('[AUTH SETUP] Page title after login:', await page.title())

    // URL待機を削除（既にリダイレクト済み）
    // await page.waitForURL(/\/(?!auth).*/, { timeout: 10000 })

    // 代わりに、セッションAPIレスポンスを確認
    if (page.url().includes('/auth/error')) {
        throw new Error('[AUTH SETUP] Login failed - redirected to error page')
    }

    console.log('[AUTH SETUP] Login successful, saving authentication state...')

    // ネットワーク待機
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // 認証状態を保存
    await page.context().storageState({ path: authFile })

    console.log('[AUTH SETUP] Authentication state saved to', authFile)

    // 保存された内容を確認
    const saved = JSON.parse(fs.readFileSync(authFile, 'utf-8'))
    console.log('[AUTH SETUP] Saved cookies count:', saved.cookies?.length)
    console.log('[AUTH SETUP] Saved cookies:', JSON.stringify(saved.cookies, null, 2))
    console.log('[AUTH SETUP] Saved origins count:', saved.origins?.length)
})