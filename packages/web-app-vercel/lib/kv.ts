import { createClient } from '@vercel/kv';
import type { VercelKV } from '@vercel/kv';

let kv: VercelKV | null | undefined = undefined;

export async function getKv(): Promise<VercelKV | null> {
    if (kv !== undefined) {
        return kv;
    }

    try {
        // 環境変数チェック
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            console.warn('[WARN] ⚠️ KV environment variables not configured, metadata features disabled');
            kv = null;
            return kv;
        }

        kv = createClient({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        });

        return kv;
    } catch (error) {
        console.error('[ERROR] Failed to initialize KV:', error);
        kv = null;
        return kv;
    }
}
