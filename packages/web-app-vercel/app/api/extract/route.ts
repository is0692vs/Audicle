import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { ExtractResponse } from '@/types/api';

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // URLのバリデーション
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        // HTMLを取得
        const html = await fetchWithTimeout(url);

        // JSDOMでパース
        const dom = new JSDOM(html, { url });
        const doc = dom.window.document;

        // Readabilityで本文抽出
        const article = new Readability(doc).parse();

        if (!article) {
            return NextResponse.json(
                { error: 'Failed to extract content from URL' },
                { status: 422 }
            );
        }

        // テキストコンテンツの取得
        const textContent = article.textContent || '';

        const response: ExtractResponse = {
            title: article.title || '',
            content: article.content || textContent,
            textLength: textContent.length,
            author: article.author || undefined,
            siteName: article.siteName || undefined,
        };

        return NextResponse.json(response);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        if (error instanceof TimeoutError) {
            return NextResponse.json(
                { error: 'Request timeout - URL took too long to fetch' },
                { status: 408 }
            );
        }

        console.error('Extract error:', error);
        return NextResponse.json(
            { error: 'Failed to extract content' },
            { status: 500 }
        );
    }
}

/**
 * タイムアウト付きでURLをフェッチ
 * Vercelのサーバーレス関数は10秒制限があるため、8秒に設定
 */
async function fetchWithTimeout(url: string, timeout: number = 8000): Promise<string> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new TimeoutError('Fetch timeout');
        }
        throw error;
    } finally {
        clearTimeout(id);
    }
}

class TimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TimeoutError';
    }
}
