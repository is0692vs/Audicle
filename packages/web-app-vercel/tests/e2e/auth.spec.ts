import { test, expect } from '@playwright/test';
import { setupAuthSession } from '../helpers/auth';

test('ログインページの表示', async ({ page }) => {
    await page.goto('/auth/signin');

    await expect(page.locator('h1')).toContainText('ログイン');
    await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible();
});

test('認証後のプロフィールアクセス', async ({ page, context }) => {
    await setupAuthSession(context);

    await page.goto('/profile');

    // ページ読み込み完了を待機
    await page.waitForLoadState('networkidle');

    // 認証が成功している場合
    await page.waitForSelector('[data-testid="user-name"]', { state: 'visible', timeout: 10000 });
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
})