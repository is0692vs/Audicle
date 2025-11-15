import { test, expect } from '@playwright/test';

test('ログインページの表示', async ({ page }) => {
    await page.goto('/auth/signin');

    await expect(page.locator('h1')).toContainText('ログイン');
    await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible();
});

test('認証後のプロフィールアクセス', async ({ page, context }) => {
    console.log('[TEST] Navigating to /profile')
    await page.goto('/profile');

    console.log('[TEST] Current URL:', page.url())
    console.log('[TEST] Page title:', await page.title())

    // ページのHTMLを確認
    const bodyText = await page.locator('body').textContent()
    console.log('[TEST] Page body text (first 500 chars):', bodyText?.substring(0, 500))

    // ページ読み込み完了を待機
    await page.waitForLoadState('networkidle');

    // 認証が成功している場合
    await page.waitForSelector('[data-testid="user-name"]', { state: 'visible', timeout: 10000 });
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
})