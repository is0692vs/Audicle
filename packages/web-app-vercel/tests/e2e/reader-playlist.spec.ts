import { test, expect } from '@playwright/test';

test.describe('Reader - Playlist related navigation', () => {
    // Note: These tests rely on data seeded by packages/web-app-vercel/scripts/seed-test-data.ts
    // Expected Data:
    // Playlist: "デフォルトプレイリスト" (Default Playlist)
    // Articles:
    //   - "テスト記事1" (Position 0)
    //   - "テスト記事2" (Position 1)
    //   - "人気記事1 - TypeScript入門" (Position 2)

    test('Playlist detail -> reader contains playlist query and prev/next visible', async ({ page }) => {
        // Visit playlists page
        await page.goto('/playlists');

        // Click the default playlist
        await page.getByRole('heading', { name: 'デフォルトプレイリスト', exact: true }).click();

        // Wait for article list and click the first article (Position 0: テスト記事1)
        await page.waitForSelector('a[data-testid="playlist-article"]', { state: 'visible' });

        // Use more specific locator to avoid strict mode violations if text appears elsewhere
        const link = page.getByTestId('playlist-article').filter({ hasText: 'テスト記事1' });
        await expect(link).toBeVisible();

        const href = await link.getAttribute('href');
        expect(href).toContain('playlist=');

        await link.click();

        // Wait for navigation to complete
        await page.waitForURL(/\/reader.*/);

        // Ensure reader loaded: wait for title first as it renders earlier than player
        await page.waitForSelector('[data-testid="article-title"]', { state: 'visible' });

        // Ensure audio player is visible and prev/next are present
        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible' });
        const prev = page.getByTestId('desktop-prev-button');
        const next = page.getByTestId('desktop-next-button');
        await expect(prev).toBeVisible();
        await expect(next).toBeVisible();
    });

    test('Home -> reader uses default playlist and prev/next visible', async ({ page }) => {
        // Open home. Home page uses default playlist.
        // Default sort on Home is usually Newest.
        // Seed insertion: Article 1, 2, 3. Article 3 is newest.
        await page.goto('/');

        // Ensure default playlist items are loaded
        await page.waitForSelector('a[data-testid="playlist-article"]', { state: 'visible' });

        // Click the first article
        const first = page.locator('a[data-testid="playlist-article"]').first();
        // Wait for the element to be enabled and stable before clicking
        await first.waitFor({ state: 'visible' });
        await first.click();

        // Verify navigation to reader
        await page.waitForURL(/\/reader.*/);

        // Ensure reader loaded: wait for title first
        await page.waitForSelector('[data-testid="article-title"]', { state: 'visible' });

        // Now page should initialize default playlist, showing prev/next
        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible' });
        const prev = page.getByTestId('desktop-prev-button');
        const next = page.getByTestId('desktop-next-button');
        await expect(prev).toBeVisible();
        await expect(next).toBeVisible();
    });

    test('Prev/Next transitions within playlist navigate correctly', async ({ page }) => {
        // Go to playlist page
        await page.goto('/playlists');
        await page.getByRole('heading', { name: 'デフォルトプレイリスト', exact: true }).click();

        await page.waitForSelector('a[data-testid="playlist-article"]', { state: 'visible' });

        // Default sort: Position.
        // 1. テスト記事1
        // 2. テスト記事2
        // 3. 人気記事1

        // Click first: テスト記事1
        await page.getByTestId('playlist-article').filter({ hasText: 'テスト記事1' }).click();

        // Wait for navigation
        await page.waitForURL(/\/reader.*/);

        // ensure in playlist mode
        await page.waitForSelector('[data-testid="article-title"]', { state: 'visible' });
        await expect(page.getByTestId('article-title')).toContainText('テスト記事1');

        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible' });
        const next = page.getByTestId('desktop-next-button');
        const prev = page.getByTestId('desktop-prev-button');
        await expect(next).toBeVisible();
        await expect(prev).toBeVisible();

        // Click next -> テスト記事2
        const initialUrl = page.url();
        await next.click();

        // Wait for URL to change to index=1
        await page.waitForURL(/index=1/);

        const afterNextUrl = page.url();
        expect(afterNextUrl).not.toBe(initialUrl);
        expect(afterNextUrl).toContain('index=');

        await page.waitForSelector('[data-testid="article-title"]', { state: 'visible' });
        await expect(page.getByTestId('article-title')).toContainText('テスト記事2');

        // Click previous -> テスト記事1
        await prev.click();

        // Wait for URL to change back to index=0
        await page.waitForURL(/index=0/);

        // Should return to initial article (index=0)
        await page.waitForSelector('[data-testid="article-title"]', { state: 'visible' });
        await expect(page.getByTestId('article-title')).toContainText('テスト記事1');
    });

    test('Playlist sort order is respected in Prev/Next navigation', async ({ page }) => {
        // Note: avoided clearLocalStorage(page) as it wipes auth cookies

        // Visit playlist page
        await page.goto('/playlists');
        await page.getByRole('heading', { name: 'デフォルトプレイリスト', exact: true }).click();

        // Change sort to Title Descending (Z-A)
        // Japanese Sort Order (UTF-8):
        // 1. 人気記事1... (Kanji, U+4EBA)
        // 2. テスト記事2 (Katakana, U+30C6)
        // 3. テスト記事1

        await page.waitForSelector('[data-testid="playlist-sort-select"]', { state: 'visible' });
        await page.getByTestId('playlist-sort-select').click();
        await page.waitForSelector("text=タイトル順 (Z-A)", { state: 'visible' });
        await page.getByRole('option', { name: 'タイトル順 (Z-A)' }).click();

        // Wait for sort to apply. First item should be 人気記事1...
        await expect(page.locator('a[data-testid="playlist-article"]').first()).toContainText('人気記事1');

        // Click the first article
        await page.locator('a[data-testid="playlist-article"]').first().click();

        // Wait for navigation
        await page.waitForURL(/\/reader.*/);

        // Ensure reader loaded
        await page.waitForSelector('[data-testid="article-title"]', { state: 'visible' });

        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible' });

        // Check title
        await expect(page.getByTestId('article-title')).toContainText('人気記事1');

        // Click Next. Should be テスト記事2
        const next = page.getByTestId('desktop-next-button');
        await next.click();

        // Wait for navigation. Index should be 1.
        await page.waitForURL(/index=1/);
        await expect(page.getByTestId('article-title')).toContainText('テスト記事2');

        // Click Next. Should be テスト記事1
        await next.click();
        await page.waitForURL(/index=2/);
        await expect(page.getByTestId('article-title')).toContainText('テスト記事1');
    });
});
