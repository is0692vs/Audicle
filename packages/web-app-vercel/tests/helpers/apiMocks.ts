import { Page } from '@playwright/test';

export async function mockExtractAPI(page: Page, response: any) {
    await page.route('**/api/extract', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(response),
        });
    });
}

export async function mockSynthesizeAPI(page: Page, audioData: string) {
    await page.route('**/api/synthesize', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ audio: audioData, duration: 10.5 }),
        });
    });
}