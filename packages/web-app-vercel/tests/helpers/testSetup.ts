import { Page } from '@playwright/test';

/**
 * localStorageをクリアする（ページ遷移後に呼び出す）
 */
export async function clearLocalStorage(page: Page) {
    try {
        await page.evaluate(() => localStorage.clear());
    } catch (error) {
        // localStorageアクセスできない場合は無視（デフォルト値が使われる）
        console.warn('localStorage clear failed:', error);
    }
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