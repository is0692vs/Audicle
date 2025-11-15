import { test, expect } from '@playwright/test'

// 認証済みテスト用
test.describe('人気記事（認証済み）', () => {
    test('人気記事ページへのアクセス', async ({ page }) => {
        // /popularページにアクセス
        await page.goto('/popular');

        // ログインページにリダイレクトされず、正常に表示される
        await expect(page).toHaveURL('/popular');
        // 「人気記事」という見出しを特定
        await expect(page.getByRole('heading', { name: '人気記事' })).toBeVisible();
    });

    test('人気記事一覧の表示', async ({ page }) => {
        await page.goto('/popular');

        const articles = page.locator('[data-testid="article-card"]');
        const count = await articles.count();

        if (count === 0) {
            console.log('No popular articles available');
            // データがない場合はページ自体が表示されることを確認
            // 「人気記事」という見出しを特定
            await expect(page.getByRole('heading', { name: '人気記事' })).toBeVisible();
            test.skip();
        }

        // 記事カードが表示されることを確認
        await expect(articles.first()).toBeVisible();
    });

    test('人気記事カードのクリックで記事ページへ遷移', async ({ page }) => {
        await page.goto('/popular');

        const articles = page.locator('[data-testid="article-card"]');
        const count = await articles.count();

        if (count === 0) {
            console.log('No popular articles available, skipping test');
            test.skip();
        }

        // 記事カードをクリック
        await articles.first().click();

        // /readerページに遷移することを確認
        await expect(page).toHaveURL(/\/reader/);

        // 記事タイトルまたはコンテンツが表示されることを確認
        await expect(page.locator('h1, [data-testid="article-title"]')).toBeVisible();
    });

    test.skip('人気記事からの音声再生', async ({ page }) => {
        // TODO: 音声プレーヤー実装完了後に有効化
        // このテストは音声再生機能の実装を待っている
        await page.goto('/popular');

        const articleCard = page.locator('[data-testid="article-card"]').first();
        await articleCard.click();

        // 音声プレーヤーが表示される
        await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();

        // 再生ボタンをクリック
        await page.click('[data-testid="play-button"]');

        // 音声が再生される
        const audio = page.locator('audio');
        await expect(audio).toHaveJSProperty('paused', false);
    });
});

// 未認証テスト用
test.describe('人気記事（未認証）', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('未ログイン時は認証ページにリダイレクト', async ({ page }) => {
        await page.goto('/popular');

        // ログインページにリダイレクトされる
        await expect(page).toHaveURL(/\/auth\/signin/);
        await expect(page.locator('h1')).toContainText('ログイン');
    });
});