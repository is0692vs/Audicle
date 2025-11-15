// 簡易版テスト（MSWなし）
jest.mock('@/lib/api-auth', () => ({
    requireAuth: jest.fn(async (handler) => handler),
    getUserEmailFromRequest: jest.fn(() => Promise.resolve('test@example.com'))
}))

// fetchをモック
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body><p>Test content</p></body></html>')
    })
) as jest.Mock

import * as routeModule from '../route'

describe('/api/extract route', () => {
    it('returns 400 for missing url', async () => {
        const mockRequest = new Request('http://localhost:3000/api/extract', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: { 'Content-Type': 'application/json' }
        })
        const res = await routeModule.POST(mockRequest)
        expect(res.status).toBe(400)
    })

    it('returns 200 and extracted content for valid url', async () => {
        const mockRequest = new Request('http://localhost:3000/api/extract', {
            method: 'POST',
            body: JSON.stringify({ url: 'https://example.com' }),
            headers: { 'Content-Type': 'application/json' }
        })
        const res = await routeModule.POST(mockRequest)
        expect(res.status).toBe(200)
    })
})
