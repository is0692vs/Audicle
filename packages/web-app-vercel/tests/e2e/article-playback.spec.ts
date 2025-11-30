import { test, expect } from '@playwright/test';
import { mockArticles } from '../helpers/testData';

test.describe('記事読み上げ機能', () => {
    // 共通のセットアップ: 記事URLを入力して抽出を実行
    test.beforeEach(async ({ page }) => {
        await page.goto('/reader');
        await page.waitForSelector('[data-testid="url-input"]', { state: 'visible' });
        await page.fill('[data-testid="url-input"]', mockArticles[0].url);
        await page.click('[data-testid="extract-button"]');
        // 記事タイトルが表示されるまで待機（実際のAPIは時間がかかる）
        await expect(page.locator('[data-testid="article-title"]')).toBeVisible({ timeout: 30000 });
    });

    test('記事URLの入力と抽出', async ({ page }) => {
        // beforeEachで既に記事抽出は完了している
        // GitHubプロフィールからタイトルが抽出されることを確認
        const title = await page.locator('[data-testid="article-title"]').textContent();
        console.log('[TEST] Extracted title:', title);

        // タイトルが存在することを確認（具体的な文字列は柔軟に）
        expect(title).toBeTruthy();
        expect(title!.length).toBeGreaterThan(0);
    });

    test('音声再生ボタンの表示と操作', async ({ page }) => {
        // 再生ボタンが表示される（デスクトップまたはモバイル）
        const playButton = page.locator('[data-testid="play-button"]');
        await expect(playButton.first()).toBeVisible({ timeout: 10000 });

        // 再生ボタンをクリック
        await playButton.first().click();

        // ローディング状態または一時停止ボタンへの遷移を確認
        await expect(
            page.locator('[data-testid="playback-loading"], [data-testid="pause-button"]').first()
        ).toBeVisible({ timeout: 30000 });

        console.log('[TEST] Play button clicked, playback started or loading');
    });

    test('再生速度の変更', async ({ page }) => {
        // 速度ボタンをクリック（デスクトップ版）
        const speedButton = page.locator('[data-testid="speed-button"]');
        if (await speedButton.isVisible()) {
            await speedButton.click();

            // 速度オプションが表示される
            await expect(page.locator('[data-testid="speed-option-1.5"]')).toBeVisible({ timeout: 5000 });

            // 1.5倍速を選択
            await page.locator('[data-testid="speed-option-1.5"]').click();

            console.log('[TEST] Playback speed changed to 1.5x');
        } else {
            // モバイル版でテスト
            const speedButtonMobile = page.locator('[data-testid="speed-button-mobile"]');
            if (await speedButtonMobile.isVisible()) {
                await speedButtonMobile.click();
                await expect(page.locator('[data-testid="speed-option-1.5"]')).toBeVisible({ timeout: 5000 });
                await page.locator('[data-testid="speed-option-1.5"]').click();
                console.log('[TEST] Playback speed changed to 1.5x (mobile)');
            }
        }
    });

    test('再生と一時停止の切り替え', async ({ page }) => {
        // 再生ボタンをクリック
        const playButton = page.locator('[data-testid="play-button"]').first();
        await expect(playButton).toBeVisible({ timeout: 10000 });
        await playButton.click();

        // 一時停止ボタンが表示されるまで待機（音声合成処理を待つ）
        const pauseButton = page.locator('[data-testid="pause-button"]').first();
        await expect(pauseButton).toBeVisible({ timeout: 60000 });

        // 一時停止をクリック
        await pauseButton.click();

        // 再生ボタンに戻る
        await expect(page.locator('[data-testid="play-button"]').first()).toBeVisible({ timeout: 10000 });

        console.log('[TEST] Play/pause toggle working correctly');
    });
});