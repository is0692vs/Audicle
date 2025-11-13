import { createClient } from '@vercel/kv';
import type { VercelKV } from '@vercel/kv';

let kvPromise: Promise<VercelKV | null> | null = null;

export async function getKv() {
    try {
        // 環境変数チェック
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            console.log('[WARN] ⚠️ KV environment variables not configured, metadata features disabled');
            return null;
        }

        const kv = createClient({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        });

        return kv;
    } catch (error) {
        console.error('[ERROR] Failed to initialize KV:', error);
        return null;
    }
}
