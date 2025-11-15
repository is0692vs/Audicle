import { test, expect } from '@playwright/test';
import { mockExtractAPI, mockSynthesizeAPI } from '../helpers/apiMocks';
import { mockArticles, mockAudioData } from '../helpers/testData';

test('記事読み込みから音声再生まで', async ({ page }) => {
    await mockExtractAPI(page, mockArticles[0]);
    await mockSynthesizeAPI(page, mockAudioData);

    await page.goto('/');

    await page.fill('[data-testid="url-input"]', mockArticles[0].url);
    await page.click('[data-testid="extract-button"]');

    await expect(page.locator('[data-testid="article-title"]')).toContainText(mockArticles[0].title);

    await page.click('[data-testid="play-button"]');

    const audioElement = page.locator('audio');
    await expect(audioElement).toHaveJSProperty('paused', false);
});