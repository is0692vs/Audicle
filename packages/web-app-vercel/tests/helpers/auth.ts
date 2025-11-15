import { BrowserContext } from '@playwright/test'

export async function setupAuthSession(context: BrowserContext) {
    const sessionToken = process.env.TEST_SESSION_TOKEN

    if (!sessionToken) {
        throw new Error('TEST_SESSION_TOKEN is not set in .env.local. Please add it to Vercel and run: vercel env pull')
    }

    await context.addCookies([
        {
            name: 'next-auth.session-token',
            value: sessionToken,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            expires: Math.floor(Date.now() / 1000) + 86400,
        },
    ])
}