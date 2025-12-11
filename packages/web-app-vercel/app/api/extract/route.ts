import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { normalizeArticleText } from '@/lib/parseArticle';
import { parseHTML } from 'linkedom';
import { ExtractResponse } from '@/types/api';
import { isSafeUrl } from '@/lib/ssrf';

// Node.js runtimeを明示的に指定（JSDOMはEdge Runtimeで動作しない）
export const runtime = 'nodejs';
// 動的レンダリングを強制（キャッシュを無効化）
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function POST(request: NextRequest) {
    console.log('[Extract API] POST request received');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        const { url } = await request.json();
        console.log('[Extract API] Extracting content from:', url);

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        // URLのバリデーション
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400, headers: corsHeaders }
            );
        }

        // SSRFチェック
        if (!(await isSafeUrl(url))) {
            console.warn('[Extract API] SSRF attempt blocked:', url);
            return NextResponse.json(
                { error: 'Access to this URL is restricted for security reasons' },
                { status: 403, headers: corsHeaders }
            );
        }

        // HTMLを取得
        const html = await fetchWithTimeout(url);

        // linkedomでパース
        const { document } = parseHTML(html);

        // Readabilityで本文抽出
        const article = new Readability(document).parse();

        if (!article) {
            return NextResponse.json(
                { error: 'Failed to extract content from URL' },
                { status: 422, headers: corsHeaders }
            );
        }

        // テキストコンテンツの取得（重複やUIテキスト混入を防ぐため normalizeArticleText を利用）
        const textContent = normalizeArticleText(article.content || '') || (article.textContent || '');

        const response: ExtractResponse = {
            title: article.title || '',
            content: article.content || textContent,
            textLength: textContent.length,
            author: article.byline || undefined,
            siteName: article.siteName || undefined,
        };

        console.log('[Extract API] Successfully extracted:', {
            title: response.title,
            textLength: response.textLength,
        });

        return NextResponse.json(response, {
            headers: corsHeaders,
        });
    } catch (error) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400, headers: corsHeaders }
            );
        }

        if (error instanceof TimeoutError) {
            return NextResponse.json(
                { error: 'Request timeout - URL took too long to fetch' },
                { status: 408, headers: corsHeaders }
            );
        }

        if (error instanceof AuthenticationRequiredError) {
            return NextResponse.json(
                { error: 'このURLは認証が必要なサイトです。ログインが必要なページは読み込めません。' },
                { status: error.statusCode, headers: corsHeaders }
            );
        }

        console.error('Extract error:', error);
        return NextResponse.json(
            { error: 'Failed to extract content' },
            { status: 500, headers: corsHeaders }
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

        // 認証が必要なサイトの場合は専用エラーをスロー
        if (response.status === 401 || response.status === 403) {
            throw new AuthenticationRequiredError(
                `このURLには認証が必要です（HTTP ${response.status}）`,
                response.status
            );
        }

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

class AuthenticationRequiredError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number = 403) {
        super(message);
        this.name = 'AuthenticationRequiredError';
        this.statusCode = statusCode;
    }
}
