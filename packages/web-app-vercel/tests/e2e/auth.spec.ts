import { test, expect } from '@playwright/test';

test('ログインページの表示', async ({ page }) => {
    await page.goto('/auth/signin');

    await expect(page.locator('h1')).toContainText('ログイン');
    await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible();
});

test('認証後のプロフィールアクセス', async ({ page, context }) => {
    await context.addCookies([{
        name: 'next-auth.session-token',
        value: process.env.TEST_SESSION_TOKEN!,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Date.now() / 1000 + 86400,
    }]);

    await page.goto('/profile');

    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
});