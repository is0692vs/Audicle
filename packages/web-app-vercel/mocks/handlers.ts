import { http, HttpResponse } from 'msw'
import { validAudioBase64, mockArticleContent } from '../tests/helpers/testData'

export const handlers = [
    // Audio synthesis API mock - returns base64-encoded MP3 audio
    http.post('/api/synthesize', () => {
        return HttpResponse.json({
            audio: validAudioBase64,
        })
    }),

    // Content extraction API mock
    http.post('/api/extract', () => {
        return HttpResponse.json({
            success: true,
            title: mockArticleContent.title,
            content: mockArticleContent.content,
            paragraphs: mockArticleContent.paragraphs,
        })
    }),
]