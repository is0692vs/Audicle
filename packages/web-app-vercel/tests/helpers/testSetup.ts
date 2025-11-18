import { Page } from '@playwright/test';

/**
 * localStorageをクリアする
 */
export async function clearLocalStorage(page: Page) {
    await page.evaluate(() => localStorage.clear());
}

/**
 * デフォルトのソート順を設定（position昇順）
 */
export async function setDefaultSort(page: Page) {
    await page.evaluate(() => {
        localStorage.setItem('audicle-home-sort', 'newest');
        // 個別のプレイリストソートはクリア（デフォルトのpositionを使用）
    });
}