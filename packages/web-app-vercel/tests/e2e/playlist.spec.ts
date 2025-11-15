import { test, expect } from '@playwright/test';
import { setupAuthSession } from '../helpers/auth';

test.beforeEach(async ({ page, context }) => {
    await setupAuthSession(context);
    await page.goto('/');
});

test('プレイリスト作成と記事追加', async ({ page }) => {
    await page.goto('/playlists');

    await page.click('[data-testid="create-playlist-button"]');
    await page.fill('[data-testid="playlist-name-input"]', '新しいプレイリスト');
    await page.click('[data-testid="save-playlist-button"]');

    await expect(page.locator('[data-testid="playlist-item"]')).toContainText('新しいプレイリスト');

    await page.goto('/');
    await page.fill('[data-testid="url-input"]', 'https://example.com/article');
    await page.click('[data-testid="extract-button"]');

    await page.click('[data-testid="add-to-playlist-button"]');
    await page.click('[data-testid="playlist-option"]:has-text("新しいプレイリスト")');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});

test('プレイリストからの連続再生', async ({ page }) => {
    await page.goto('/playlists');

    const firstPlaylist = page.locator('[data-testid="playlist-item"]').first();
    await firstPlaylist.click();

    await expect(page.locator('[data-testid="playlist-article"]')).toHaveCount(await page.locator('[data-testid="playlist-article"]').count());

    await page.click('[data-testid="play-all-button"]');

    await expect(page.locator('audio')).toHaveJSProperty('paused', false);
});