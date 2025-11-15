import { http, HttpResponse } from 'msw'

export const handlers = [
    // API Routes のモック例
    http.post('/api/synthesize', () => {
        return HttpResponse.json({
            success: true,
            audioUrl: 'mock-audio-url',
        })
    }),

    http.post('/api/extract', () => {
        return HttpResponse.json({
            success: true,
            content: 'mock content',
        })
    }),
]