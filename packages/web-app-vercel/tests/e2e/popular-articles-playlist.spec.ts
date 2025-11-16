import { test, expect } from '@playwright/test'

// 認証済みの状態でテストを行う
// Playwright のプロジェクト設定ですでに storageState が設定されているため、ここでは明示しなくても OK
// test.use({ storageState: 'playwright/.auth/user.json' })

// この spec は以下のシナリオを検証します：
// 1) 未読記事を人気記事一覧からプレイリストに追加
// 2) API が 404 を返した際にモーダルが閉じないこと
// 3) 既読記事をプレイリストから削除
// 4) モーダル外クリックで閉じる（ガード期間後）

test.describe('Popular Articles - Playlist Management', () => {
    test('should add unread article to playlist from popular page', async ({ page }) => {
        await page.goto('/popular')

        const cards = page.locator('[data-testid="article-card"]')
        const count = await cards.count()
        if (count === 0) {
            console.log('No popular articles available, skipping test')
            test.skip()
        }

        const firstCard = cards.first()
        // Plus ボタンはカード内に1つある想定
        const plusButton = firstCard.locator('button').first()

        await plusButton.click()

        const modal = page.locator('[role="dialog"], [data-testid="playlist-modal"]')
        await expect(modal).toBeVisible()

        // 1つ目のプレイリスト(多くの環境ではデフォルトプレイリストが最初にあるはず)
        const playlistCheckbox = modal.locator('input[type="checkbox"]').first()

        await playlistCheckbox.check()

        const saveButton = modal.getByRole('button', { name: /保存|Save/ })
        await saveButton.click()

        // bulk_update の完了を待機
        await page.waitForResponse(response =>
            response.url().includes('/api/playlists/bulk_update') && response.status() === 200
        )

        // モーダルが閉じる
        await expect(modal).not.toBeVisible()

        // 人気記事のままであることを確認
        await expect(page).toHaveURL('/popular')
    })

    test('should keep modal open when API returns 404', async ({ page }) => {
        // モック: article->playlists API を 404 にする
        await page.route('**/api/articles/*/playlists', route => {
            route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Article not found' }),
            })
        })

        await page.goto('/popular')

        const cards = page.locator('[data-testid="article-card"]')
        const count = await cards.count()
        if (count === 0) {
            console.log('No popular articles available, skipping test')
            test.skip()
        }

        const plusButton = cards.first().locator('button').first()
        await plusButton.click()

        const modal = page.locator('[role="dialog"], [data-testid="playlist-modal"]')
        await expect(modal).toBeVisible()

        // エラーメッセージが表示される
        const errorMessage = modal.locator('text=/エラー|error|failed/i')
        await expect(errorMessage).toBeVisible()

        // ページ遷移していないこと
        await expect(page).toHaveURL('/popular')

        // モーダルがまだ表示されていること
        await expect(modal).toBeVisible()
    })

    test('should remove article from playlist', async ({ page }) => {
        await page.goto('/popular')

        const cards = page.locator('[data-testid="article-card"]')
        const count = await cards.count()
        if (count === 0) {
            console.log('No popular articles available, skipping test')
            test.skip()
        }

        const plusButton = cards.first().locator('button').first()
        await plusButton.click()

        const modal = page.locator('[role="dialog"], [data-testid="playlist-modal"]')
        await expect(modal).toBeVisible()

        // チェック済みのチェックボックスがあるか確認
        const checked = modal.locator('input[type="checkbox"]:checked')
        const checkedCount = await checked.count()
        if (checkedCount === 0) {
            console.log('No checked playlists for this article, skipping remove flow')
            test.skip()
        }

        await checked.first().uncheck()

        const saveButton = modal.getByRole('button', { name: /保存|Save/ })
        await saveButton.click()

        // bulk_update の完了を待機
        await page.waitForResponse(response =>
            response.url().includes('/api/playlists/bulk_update') && response.status() === 200
        )

        await expect(modal).not.toBeVisible()
    })

    test('should close modal on overlay click after guard period', async ({ page }) => {
        await page.goto('/popular')

        const cards = page.locator('[data-testid="article-card"]')
        const count = await cards.count()
        if (count === 0) {
            console.log('No popular articles available, skipping test')
            test.skip()
        }

        const plusButton = cards.first().locator('button').first()
        await plusButton.click()

        const modal = page.locator('[role="dialog"], [data-testid="playlist-modal"]')
        await expect(modal).toBeVisible()

        // 100ms ガードをまたぐ
        await page.waitForTimeout(150)

        // モーダル外の座標をクリック
        await page.mouse.click(10, 10)

        await expect(modal).not.toBeVisible()
    })
})
