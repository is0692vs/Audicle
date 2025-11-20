import { test, expect } from '@playwright/test';
import { mockArticles } from '../helpers/testData';
import { clearLocalStorage } from '../helpers/testSetup';

test.describe.skip('Reader - Playlist related navigation', () => {
    // TODO: Setup test Supabase project with seed data
    test.beforeEach(async ({ page }) => {
        // Mock playlist APIs to avoid DB dependency
        const mockPlaylist = {
            id: 'test-playlist-id',
            name: 'Test Playlist',
            owner_email: 'test@example.com',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            playlist_items: [
                {
                    id: 'item-1',
                    playlist_id: 'test-playlist-id',
                    article_id: 'article-1',
                    position: 0,
                    added_at: '2023-01-01T00:00:00Z',
                    article: {
                        id: 'article-1',
                        url: 'https://example.com?a=1',
                        title: 'Apple',
                        content: 'Test content for Apple',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z'
                    }
                },
                {
                    id: 'item-2',
                    playlist_id: 'test-playlist-id',
                    article_id: 'article-2',
                    position: 1,
                    added_at: '2023-01-01T00:00:00Z',
                    article: {
                        id: 'article-2',
                        url: 'https://example.com?b=2',
                        title: 'Banana',
                        content: 'Test content for Banana',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z'
                    }
                },
                {
                    id: 'item-3',
                    playlist_id: 'test-playlist-id',
                    article_id: 'article-3',
                    position: 2,
                    added_at: '2023-01-01T00:00:00Z',
                    article: {
                        id: 'article-3',
                        url: 'https://example.com?c=3',
                        title: 'Cherry',
                        content: 'Test content for Cherry',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z'
                    }
                }
            ]
        };

        // Mock playlist creation
        await page.route('**/api/playlists', async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({ json: mockPlaylist });
            } else {
                // GET playlists list
                await route.fulfill({ json: [mockPlaylist] });
            }
        });

        // Mock playlist detail
        await page.route('**/api/playlists/test-playlist-id', async route => {
            await route.fulfill({ json: mockPlaylist });
        });

        // Mock playlist items addition
        await page.route('**/api/playlists/test-playlist-id/items', async route => {
            await route.fulfill({ json: { success: true } });
        });

        // Mock set default playlist
        await page.route('**/api/playlists/test-playlist-id/set-default', async route => {
            await route.fulfill({ json: { success: true } });
        });

        // Mock playlist deletion
        await page.route('**/api/playlists/test-playlist-id', async route => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({ json: { success: true } });
            }
        });
    });
    test('Playlist detail -> reader contains playlist query and prev/next visible', async ({ page }) => {
        // Visit playlist page directly (mocked data will be used)
        await page.goto('/playlists/test-playlist-id');
        await page.waitForSelector('a[data-testid="playlist-article"]', { state: 'visible' });
        const link = page.locator('a[data-testid="playlist-article"]').first();
        const href = await link.getAttribute('href');
        expect(href).toContain('playlist=');
        // navigate to reader using link
        if (href) {
            await page.goto(href);
        } else {
            await link.click();
        }

        // Ensure audio player is visible and prev/next are present
        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible' });
        const prev = page.getByTestId('desktop-prev-button');
        const next = page.getByTestId('desktop-next-button');
        await expect(prev).toBeVisible();
        await expect(next).toBeVisible();
    });

    test('Home -> reader uses default playlist and prev/next visible', async ({ page }) => {
        // Open home and click first article (home shows default playlist items)
        await page.goto('/');
        await page.waitForSelector('a[data-testid="playlist-article"]', { state: 'visible' });
        // Ensure the article we expect exists in the page; find the first
        const first = page.locator('a[data-testid="playlist-article"]').first();
        await first.click();

        // Now page should navigate to /reader?url=... and initialize default playlist, showing prev/next
        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible' });
        const prev = page.getByTestId('desktop-prev-button');
        const next = page.getByTestId('desktop-next-button');
        await expect(prev).toBeVisible();
        await expect(next).toBeVisible();
    });

    test('Prev/Next transitions within playlist navigate correctly', async ({ page }) => {
        // Go to playlist page and open first article
        await page.goto('/playlists/test-playlist-id');
        await page.waitForSelector('a[data-testid="playlist-article"]', { state: 'visible' });
        const firstLink = page.locator('a[data-testid="playlist-article"]').first();
        const href = await firstLink.getAttribute('href');
        if (href) await page.goto(href);
        else await firstLink.click();

        // ensure in playlist mode
        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible' });
        const next = page.getByTestId('desktop-next-button');
        const prev = page.getByTestId('desktop-prev-button');
        await expect(next).toBeVisible();
        await expect(prev).toBeVisible();

        // Click next and verify URL index increments and content changes
        const initialUrl = page.url();
        await next.click();
        await page.waitForURL((url) => url.toString() !== initialUrl);
        const afterNextUrl = page.url();
        expect(afterNextUrl).not.toBe(initialUrl);
        expect(afterNextUrl).toContain('index=');

        // Click previous and ensure we go back to the initial article
        await prev.click();
        await page.waitForURL((url) => url.toString() !== afterNextUrl);
        const afterPrevUrl = page.url();
        expect(afterPrevUrl).toBe(initialUrl);
    });

    test('Playlist sort order is respected in Prev/Next navigation', async ({ page }) => {
        await clearLocalStorage(page);

        // Visit playlist page
        await page.goto('/playlists/test-playlist-id');

        // Change sort to Title Descending (Z-A)
        // Use explicit data-testid for the playlist sort select to avoid flakiness
        await page.waitForSelector('[data-testid="playlist-sort-select"]', { state: 'visible' });
        await page.getByTestId('playlist-sort-select').click();
        await page.waitForSelector("text=タイトル順 (Z-A)", { state: 'visible' });
        await page.getByRole('option', { name: 'タイトル順 (Z-A)' }).click();

        // Wait for sort to apply. Cherry should be first.
        await expect(page.locator('a[data-testid="playlist-article"]').first()).toContainText('Cherry');

        // Click the first article (Cherry)
        await page.locator('a[data-testid="playlist-article"]').first().click();

        // Ensure reader loaded
        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible' });

        // Check title is Cherry
        await expect(page.getByTestId('article-title')).toContainText('Cherry');

        // Click Next. Should be Banana (Z -> A: Cherry -> Banana -> Apple)
        const next = page.getByTestId('desktop-next-button');
        await next.click();

        // Wait for navigation
        await page.waitForURL(/index=1/);
        await expect(page.getByTestId('article-title')).toContainText('Banana');

        // Click Next. Should be Apple
        await next.click();
        await page.waitForURL(/index=2/);
        await expect(page.getByTestId('article-title')).toContainText('Apple');

    });
});

