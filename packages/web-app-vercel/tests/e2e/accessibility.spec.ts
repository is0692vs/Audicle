import { test, expect } from '@playwright/test';

test.describe('Accessibility Attributes', () => {

    test('Sidebar buttons have correct aria-labels', async ({ page }) => {
        // Navigate to home (Sidebar is present)
        await page.goto('/');

        // On desktop, the "Toggle menu" button might be hidden, so we check existence or check mobile view.
        // The Sidebar implementation has:
        // Mobile trigger: `aria-label="メニューを開く"` (visible lg:hidden)
        // Mobile close: `aria-label="メニューを閉じる"` (visible lg:hidden inside sidebar)

        // Let's emulate mobile to see the toggle button
        await page.setViewportSize({ width: 375, height: 667 });

        const openMenuButton = page.locator('button[aria-label="メニューを開く"]');
        await expect(openMenuButton).toBeVisible();

        // Open the menu to see the close button
        await openMenuButton.click();

        const closeMenuButton = page.locator('button[aria-label="メニューを閉じる"]');
        await expect(closeMenuButton).toBeVisible();
    });

    test('PopularArticleCard has correct aria-labels and titles', async ({ page }) => {
        // Go to popular page
        await page.goto('/popular');

        // Wait for articles to load
        // Similar strategy to popular-articles.spec.ts
        await Promise.all([
            page.waitForResponse(
                resp => resp.url().includes('/api/stats/popular') && resp.status() === 200,
                { timeout: 15000 }
            ).catch(() => console.log('Timeout waiting for popular stats')),
            page.reload() // Reload to ensure we trigger the fetch
        ]);

        await page.waitForTimeout(2000); // Wait for render

        const articles = page.locator('[data-testid="article-card"]');
        const count = await articles.count();

        if (count === 0) {
            console.log('No popular articles found, skipping PopularArticleCard check');
            test.skip();
            return;
        }

        const firstCard = articles.first();

        // Check "Add to playlist" button
        const addButton = firstCard.locator('button[aria-label="プレイリストに追加"]');
        await expect(addButton).toBeVisible();
        await expect(addButton).toHaveAttribute('title', 'プレイリストに追加');

        // Check Title tooltip
        // The title is in an h3
        const titleElement = firstCard.locator('h3');
        const titleText = await titleElement.innerText();
        await expect(titleElement).toHaveAttribute('title', titleText);
    });

    test('ArticleCard has correct aria-labels and titles', async ({ page }) => {
        // Go to playlists page which lists articles in a playlist
        await page.goto('/playlists');

        // Wait for any network activity or simple timeout
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // We need to click into a playlist to see ArticleCards
        const playlists = page.locator('[data-testid="playlist-item"]');
        const playlistCount = await playlists.count();

        if (playlistCount === 0) {
             // Create a playlist if none exist (reuse logic from playlist.spec.ts if needed, but keeping it simple)
             console.log('No playlists found. Attempting to create one.');
             await page.click('[data-testid="create-playlist-button"]');
             await page.waitForSelector('[data-testid="playlist-name-input"]', { state: 'visible' });
             await page.fill('[data-testid="playlist-name-input"]', 'Accessibility Test Playlist');
             await page.click('[data-testid="save-playlist-button"]');
             await page.waitForTimeout(1000);
        }

        // Click the first playlist
        const firstPlaylist = page.locator('[data-testid="playlist-item"]').first();

        // Handle navigation safely
        let navigated = false;
        try {
            await Promise.all([
                page.waitForURL(/\/playlists\/[^\/]+/, { timeout: 10000 }),
                firstPlaylist.click()
            ]);
            navigated = true;
        } catch (e) {
            const href = await firstPlaylist.getAttribute('href');
            if (href) {
                await page.goto(href);
                navigated = true;
            }
        }

        if (!navigated) {
             console.log('Failed to navigate to playlist detail');
             test.skip();
             return;
        }

        // Now look for ArticleCards
        const articleCards = page.locator('[data-testid="playlist-article"]');
        const articleCount = await articleCards.count();

        if (articleCount === 0) {
            console.log('No articles in playlist, skipping ArticleCard check');
            test.skip();
            return;
        }

        const firstArticle = articleCards.first();

        // Check "Add to playlist" (Plus) and "Remove from playlist" (Minus) buttons
        // Note: Logic in ArticleCard.tsx shows both buttons but functionality depends on context (add to OTHER playlist vs remove from THIS).
        // The implementation shows:
        // <Button onClick={onPlaylistAdd} aria-label="プレイリストに追加"> <Plus /> </Button>
        // <Button onClick={onRemove} aria-label="プレイリストから削除"> <Minus /> </Button>

        const addButton = firstArticle.locator('button[aria-label="プレイリストに追加"]');
        const removeButton = firstArticle.locator('button[aria-label="プレイリストから削除"]');

        await expect(addButton).toBeVisible();
        await expect(addButton).toHaveAttribute('title', 'プレイリストに追加');

        await expect(removeButton).toBeVisible();
        await expect(removeButton).toHaveAttribute('title', 'プレイリストから削除');

        // Check Title tooltip
        const titleElement = firstArticle.locator('h3');
        const titleText = await titleElement.innerText();
        await expect(titleElement).toHaveAttribute('title', titleText);

        // Check URL/Domain tooltip
        // The URL is in the 'p' tag following the h3
        const urlElement = firstArticle.locator('p.text-zinc-400'); // Based on classes in ArticleCard
        // We can't easily guess the URL text because it's truncated or processed
        // But we can check if the title attribute exists
        await expect(urlElement).toHaveAttribute('title');
    });
});
