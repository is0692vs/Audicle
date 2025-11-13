import type { VercelKV } from '@vercel/kv';

let kvInstance: VercelKV | null = null;
let initialized = false;

export async function getKv(): Promise<VercelKV | null> {
    if (initialized) {
        return kvInstance;
    }

    try {
        // @vercel/kv はオプショナルな依存関係のため、動的インポートを使用
        const kvModule = await import('@vercel/kv').catch(() => null);
        if (kvModule && 'kv' in kvModule) {
            kvInstance = kvModule.kv as VercelKV;
            return kvInstance;
        }
    } catch (error) {
        console.warn('@vercel/kv is not available, metadata tracking will be skipped', error);
    }

    initialized = true;
    return kvInstance;
}
