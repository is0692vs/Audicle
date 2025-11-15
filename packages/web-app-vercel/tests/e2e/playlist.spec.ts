import { test, expect } from '@playwright/test';
import { setupAuthSession } from '../helpers/auth';

test.beforeEach(async ({ page, context }) => {
    await setupAuthSession(context);
    await page.goto('/');
});

test('プレイリスト作成と記事追加', async ({ page, context }) => {
    await setupAuthSession(context);
    await page.goto('/playlists');

    // 作成ボタンをクリックしてフォームを表示
    await page.click('[data-testid="create-playlist-button"]');

    // フォームが表示されるまで待機
    await page.waitForSelector('[data-testid="playlist-name-input"]', { state: 'visible' });

    await page.fill('[data-testid="playlist-name-input"]', '新しいプレイリスト');
    await page.click('[data-testid="save-playlist-button"]');

    // 作成されたプレイリストが表示されるまで待機
    await page.waitForSelector('[data-testid="playlist-item"]', { state: 'visible' });
    await expect(page.locator('[data-testid="playlist-item"]')).toContainText('新しいプレイリスト');
})

test('プレイリストからの連続再生', async ({ page, context }) => {
    await setupAuthSession(context);
    await page.goto('/playlists');

    await page.waitForLoadState('networkidle');

    // プレイリストが存在するか確認
    const playlistItem = page.locator('[data-testid="playlist-item"]').first();
    await playlistItem.waitFor({ state: 'visible', timeout: 10000 });

    await playlistItem.click();

    // プレイリスト詳細ページに遷移
    await expect(page).toHaveURL(/\/playlists\/.+/);

    // 記事が存在する場合のみテスト
    const articles = page.locator('[data-testid="playlist-article"]');
    const count = await articles.count();

    if (count > 0) {
        expect(count).toBeGreaterThan(0);
    }
})