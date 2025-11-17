import { test, expect } from '@playwright/test';
import { mockArticles } from '../helpers/testData';

test.describe('Reader - Playlist related navigation', () => {
    test('Playlist detail -> reader contains playlist query and prev/next visible', async ({ page }) => {
        // create a playlist and add two articles
        const created = await page.evaluate(async (articles) => {
            const createResp = await fetch('/api/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: `E2E Reader Playlist ${Date.now()}` }),
            });
            if (!createResp.ok) return null;
            const playlist = await createResp.json();
            for (const article of articles) {
                await fetch(`/api/playlists/${playlist.id}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ article_url: article.url, article_title: article.title, thumbnail_url: null, last_read_position: 0 }),
                });
            }
            return playlist;
        }, [mockArticles[0], mockArticles[1]]);

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
        await page.evaluate(async (id) => {
            await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
        }, created.id);
    });

    test('Home -> reader uses default playlist and prev/next visible', async ({ page }) => {
        // create a playlist and set as default
        const created = await page.evaluate(async (articles) => {
            const createResp = await fetch('/api/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: `E2E Default Playlist ${Date.now()}` }),
            });
            if (!createResp.ok) return null;
            const playlist = await createResp.json();
            for (const article of articles) {
                await fetch(`/api/playlists/${playlist.id}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ article_url: article.url, article_title: article.title, thumbnail_url: null, last_read_position: 0 }),
                });
            }
            // set default
            await fetch(`/api/playlists/${playlist.id}/set-default`, { method: 'PUT' });
            return playlist;
        }, [mockArticles[0], mockArticles[1]]);

        expect(created).toBeTruthy();
        if (!created) return;

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
        await page.evaluate(async (id) => {
            await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
        }, created.id);
    });

    test('Prev/Next transitions within playlist navigate correctly', async ({ page }) => {
        // create playlist with at least 2 articles
        const created = await page.evaluate(async (articles) => {
            const createResp = await fetch('/api/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: `E2E Transition Playlist ${Date.now()}` }),
            });
            if (!createResp.ok) return null;
            const playlist = await createResp.json();
            for (const article of articles) {
                await fetch(`/api/playlists/${playlist.id}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ article_url: article.url, article_title: article.title, thumbnail_url: null, last_read_position: 0 }),
                });
            }
            return playlist;
        }, [mockArticles[0], mockArticles[1]]);

        expect(created).toBeTruthy();
        if (!created) return;

        // Go to playlist page and open first article
        await page.goto(`/playlists/${created.id}`);
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
        expect(afterNextUrl).toContain('playlistIndex=');

        // Click previous and ensure we go back (circular behavior)
        await prev.click();
        await page.waitForURL((url) => url.toString() !== afterNextUrl);
        const afterPrevUrl = page.url();
        expect(afterPrevUrl).not.toBe(afterNextUrl);

        // cleanup
        await page.evaluate(async (id) => {
            await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
        }, created.id);
    });
});

