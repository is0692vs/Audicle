import { test, expect } from '@playwright/test';
import { mockArticles } from '../helpers/testData';
import { clearLocalStorage } from '../helpers/testSetup';

test.describe('Reader - Playlist related navigation', () => {
    test('Playlist detail -> reader contains playlist query and prev/next visible', async ({ page }) => {
        // create a playlist and add two articles via page.request
        const createResp = await page.request.post('/api/playlists', {
            data: { name: `E2E Reader Playlist ${Date.now()}` },
        });
        let created = null;
        if (createResp.ok()) {
            created = await createResp.json();
            for (const article of [mockArticles[0], mockArticles[1]]) {
                await page.request.post(`/api/playlists/${created.id}/items`, {
                    data: { article_url: article.url, article_title: article.title, thumbnail_url: null, last_read_position: 0 },
                });
            }
        }

        expect(created).toBeTruthy();
        if (!created) return;

        // Visit playlist page and click first article
        await page.goto(`/playlists/${created.id}`);
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
        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible', timeout: 30000 });
        const prev = page.getByTestId('desktop-prev-button');
        const next = page.getByTestId('desktop-next-button');
        await expect(prev).toBeVisible();
        await expect(next).toBeVisible();

        // cleanup
        await page.request.delete(`/api/playlists/${created.id}`);
    });

    test('Home -> reader uses default playlist and prev/next visible', async ({ page }) => {
        // create a playlist and set as default
        const createResp2 = await page.request.post('/api/playlists', {
            data: { name: `E2E Default Playlist ${Date.now()}` },
        });
        let created2 = null;
        if (createResp2.ok()) {
            created2 = await createResp2.json();
            for (const article of [mockArticles[0], mockArticles[1]]) {
                await page.request.post(`/api/playlists/${created2.id}/items`, {
                    data: { article_url: article.url, article_title: article.title, thumbnail_url: null, last_read_position: 0 },
                });
            }
            // set default
            await page.request.put(`/api/playlists/${created2.id}/set-default`);
        }

        expect(created2).toBeTruthy();
        if (!created2) return;

        // Open home and click first article (home shows default playlist items)
        await page.goto('/');
        await page.waitForSelector('a[data-testid="playlist-article"]', { state: 'visible', timeout: 20000 });
        // Ensure the article we expect exists in the page; find the first
        const first = page.locator('a[data-testid="playlist-article"]').first();
        await first.click();

        // Now page should navigate to /reader?url=... and initialize default playlist, showing prev/next
        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible', timeout: 30000 });
        const prev = page.getByTestId('desktop-prev-button');
        const next = page.getByTestId('desktop-next-button');
        await expect(prev).toBeVisible();
        await expect(next).toBeVisible();

        // cleanup
        await page.request.delete(`/api/playlists/${created2.id}`);
    });

    test('Prev/Next transitions within playlist navigate correctly', async ({ page }) => {
        // create playlist with at least 2 articles
        const createResp3 = await page.request.post('/api/playlists', {
            data: { name: `E2E Transition Playlist ${Date.now()}` },
        });
        let created3 = null;
        if (createResp3.ok()) {
            created3 = await createResp3.json();
            for (const article of [mockArticles[0], mockArticles[1]]) {
                await page.request.post(`/api/playlists/${created3.id}/items`, {
                    data: { article_url: article.url, article_title: article.title, thumbnail_url: null, last_read_position: 0 },
                });
            }
        }

        expect(created3).toBeTruthy();
        if (!created3) return;

        // Go to playlist page and open first article
        await page.goto(`/playlists/${created3.id}`);
        await page.waitForSelector('a[data-testid="playlist-article"]', { state: 'visible', timeout: 20000 });
        const firstLink = page.locator('a[data-testid="playlist-article"]').first();
        const href = await firstLink.getAttribute('href');
        if (href) await page.goto(href);
        else await firstLink.click();

        // ensure in playlist mode
        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible', timeout: 30000 });
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

        // cleanup
        await page.request.delete(`/api/playlists/${created3.id}`);
    });

    test('Playlist sort order is respected in Prev/Next navigation', async ({ page }) => {
        // Create playlist
        const createResp = await page.request.post('/api/playlists', {
            data: { name: `E2E Sort Playlist ${Date.now()}` },
        });
        const created = await createResp.json();
        expect(created).toBeTruthy();

        // Add articles with different titles to test sorting
        // Article A: "Apple"
        // Article B: "Banana"
        // Article C: "Cherry"
        const articles = [
            { url: 'https://httpbin.org/html?a=1', title: 'Apple' },
            { url: 'https://httpbin.org/html?b=2', title: 'Banana' },
            { url: 'https://httpbin.org/html?c=3', title: 'Cherry' }
        ];

        for (const article of articles) {
            await page.request.post(`/api/playlists/${created.id}/items`, {
                data: { article_url: article.url, article_title: article.title, thumbnail_url: null, last_read_position: 0 },
            });
        }

        // Visit playlist page
        await page.goto(`/playlists/${created.id}`);

        // Change sort to Title Descending (Z-A)
        // Select trigger usually has role combobox
        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: 'タイトル順 (Z-A)' }).click();

        // Wait for sort to apply. Cherry should be first.
        await expect(page.locator('a[data-testid="playlist-article"]').first()).toContainText('Cherry');

        // Click the first article (Cherry)
        await page.locator('a[data-testid="playlist-article"]').first().click();

        // Ensure reader loaded
        await page.waitForSelector('[data-testid="audio-player-desktop"]', { state: 'visible', timeout: 30000 });

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

        // cleanup
        await page.request.delete(`/api/playlists/${created.id}`);
    });
});

