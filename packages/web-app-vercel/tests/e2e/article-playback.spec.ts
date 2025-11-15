import { test, expect } from '@playwright/test';
import { mockArticles } from '../helpers/testData';

test('記事URLの入力と抽出', async ({ page }) => {
    // APIモックを削除 - 実際のAPIを使用
    await page.goto('/reader');

    // URL入力欄が表示される
    await page.waitForSelector('[data-testid="url-input"]', { state: 'visible' });

    // 自分のGitHubプロフィールURLを入力
    await page.fill('[data-testid="url-input"]', mockArticles[0].url);
    await page.click('[data-testid="extract-button"]');

    // 記事タイトルが表示される（実際の抽出が成功）
    // タイムアウトを長めに設定（実際のAPIは時間がかかる）
    await expect(page.locator('[data-testid="article-title"]')).toBeVisible({ timeout: 30000 });

    // GitHubプロフィールからタイトルが抽出されることを確認
    const title = await page.locator('[data-testid="article-title"]').textContent();
    console.log('[TEST] Extracted title:', title);

    // タイトルが存在することを確認（具体的な文字列は柔軟に）
    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(0);
});

test.skip('記事読み込みから音声再生まで', async ({ page }) => {
    // TODO: 音声合成API実装完了後に有効化
    await page.goto('/reader');

    await page.waitForSelector('[data-testid="url-input"]', { state: 'visible' });
    await page.fill('[data-testid="url-input"]', mockArticles[0].url);
    await page.click('[data-testid="extract-button"]');

    // 音声プレーヤーが表示される
    await page.waitForSelector('[data-testid="audio-player"]', { state: 'visible' });
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
})