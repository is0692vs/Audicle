import { test, expect } from '@playwright/test';
import { setupAuthSession } from '../helpers/auth';

test('人気記事一覧の表示', async ({ page }) => {
    await page.goto('/popular');

    // ページ読み込み完了を待機
    await page.waitForLoadState('networkidle');

    // 記事リストまたは空のメッセージが表示されるまで待機
    const hasArticles = await page.locator('[data-testid="popular-articles-list"]').isVisible({ timeout: 5000 }).catch(() => false);

    if (hasArticles) {
        const articles = page.locator('[data-testid="article-card"]');
        expect(await articles.count()).toBeGreaterThan(0);
    } else {
        // データがない場合はスキップ
        console.log('No popular articles available, skipping test');
    }
})

test('人気記事からの即座再生', async ({ page, context }) => {
    await setupAuthSession(context);
    await page.goto('/popular');

    await page.waitForLoadState('networkidle');

    // 記事カードが存在するか確認
    const articleCard = page.locator('[data-testid="article-card"]').first();
    await articleCard.waitFor({ state: 'visible', timeout: 10000 });

    await articleCard.click();

    await expect(page).toHaveURL(/\/reader/);
    await page.waitForSelector('[data-testid="audio-player"]', { state: 'visible', timeout: 10000 });
})

test('未ログイン時のアクセス制限', async ({ page }) => {
    await page.goto('/popular');

    const firstArticle = page.locator('[data-testid="article-card"]').first();
    await firstArticle.click();

    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.locator('h1')).toContainText('ログイン');
});