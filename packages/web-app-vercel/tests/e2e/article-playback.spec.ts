import { test, expect } from '@playwright/test';
import { mockExtractAPI, mockSynthesizeAPI } from '../helpers/apiMocks';
import { mockArticles, mockAudioData } from '../helpers/testData';

test('記事読み込みから音声再生まで', async ({ page }) => {
    await mockExtractAPI(page, mockArticles[0]);
    await mockSynthesizeAPI(page, mockAudioData);

    // /readerに直接アクセス（空の状態）
    await page.goto('/reader');

    // URL入力欄が表示されるまで待機
    await page.waitForSelector('[data-testid="url-input"]', { state: 'visible' });

    await page.fill('[data-testid="url-input"]', mockArticles[0].url);
    await page.click('[data-testid="extract-button"]');

    // 記事タイトルが表示されるまで待機
    await page.waitForSelector('[data-testid="article-title"]', { state: 'visible' });
    await expect(page.locator('[data-testid="article-title"]')).toContainText(mockArticles[0].title);

    // オーディオプレーヤーが表示されるまで待機
    await page.waitForSelector('[data-testid="audio-player"]', { state: 'visible' });
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
})