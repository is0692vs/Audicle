import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { ArticleMetadata } from '@/types/cache';

// Vercel KV 初期化関数
let kvInstance: unknown = undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getKv(): Promise<any | null> {
    if (kvInstance !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return kvInstance as any;
    }

    try {
        const kvModule = await import('@vercel/kv').catch(() => null);
        if (kvModule) {
            kvInstance = kvModule.kv;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return kvInstance as any;
        }
    } catch {
        console.warn('@vercel/kv is not available, metadata tracking will be skipped');
    }

    kvInstance = null;
    return null;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 許可リスト（環境変数から取得、カンマ区切り）
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split(',').map(e => e.trim()) || [];

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
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        // 認証チェック
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: corsHeaders }
            );
        }

        // 許可リストチェック
        if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(session.user.email)) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403, headers: corsHeaders }
            );
        }

        const kv = await getKv();

        if (!kv) {
            console.warn('KV not available, skipping metadata update');
            return NextResponse.json(
                { success: false, reason: 'KV not available' },
                { status: 503, headers: corsHeaders }
            );
        }

        const { articleUrl, voice, completedPlayback, lastPlayedChunk } = await request.json();

        if (!articleUrl || !voice) {
            return NextResponse.json(
                { error: 'articleUrl and voice are required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const metadataKey = `article:${articleUrl}:${voice}`;
        const metadata = await kv.get(metadataKey) as ArticleMetadata | null;

        if (!metadata) {
            return NextResponse.json(
                { error: 'Metadata not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        // メタデータ更新
        await kv.set(metadataKey, {
            ...metadata,
            completedPlayback: completedPlayback ?? metadata.completedPlayback,
            lastPlayedChunk: lastPlayedChunk ?? metadata.lastPlayedChunk,
            lastAccessed: new Date().toISOString()
        });

        return NextResponse.json({ success: true }, { headers: corsHeaders });
    } catch (error) {
        console.error('Update playback error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
