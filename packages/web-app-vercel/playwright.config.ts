import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// .env.localを読み込む（アプリ用の環境変数）
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

// .env.test.localを読み込む（テスト専用の環境変数，優先される）
dotenv.config({ path: path.resolve(__dirname, '.env.test.local') })

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    timeout: 60000,
    expect: { timeout: 10000 },
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        // 認証状態を全テストで使用
        storageState: 'playwright/.auth/user.json',
    },
    projects: [
        // 認証セットアップ（最初に実行）
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },

        // テスト実行（setupの後に実行）
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
            },
            dependencies: ['setup'],
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: {
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
        },
    },
})