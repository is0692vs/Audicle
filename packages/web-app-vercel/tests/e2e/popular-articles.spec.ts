import { test, expect } from '@playwright/test';
import { setupAuthSession } from '../helpers/auth';

test('人気記事一覧の表示', async ({ page }) => {
    await page.goto('/popular');

    await expect(page.locator('[data-testid="popular-articles-list"]')).toBeVisible();

    const articles = page.locator('[data-testid="article-card"]');
    expect(await articles.count()).toBeGreaterThan(0);

    await expect(page.locator('[data-testid="cache-badge"]').first()).toBeVisible();
});

test('人気記事からの即座再生', async ({ page, context }) => {
    await setupAuthSession(context);
    await page.goto('/popular');

    await page.locator('[data-testid="article-card"]').first().click();

    await expect(page).toHaveURL(/\/reader\//);
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible({ timeout: 5000 });

    await page.waitForFunction(() => {
        const audio = document.querySelector('audio');
        return audio && audio.readyState >= 2;
    });

    await page.click('[data-testid="play-button"]');
    await expect(page.locator('audio')).toHaveJSProperty('paused', false);
});

test('未ログイン時のアクセス制限', async ({ page }) => {
    await page.goto('/popular');

    const firstArticle = page.locator('[data-testid="article-card"]').first();
    await firstArticle.click();

    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.locator('h1')).toContainText('ログイン');
});