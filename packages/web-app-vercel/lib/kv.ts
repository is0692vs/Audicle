import type { VercelKV } from '@vercel/kv';

let kvPromise: Promise<VercelKV | null> | null = null;

export function getKv(): Promise<VercelKV | null> {
    if (!kvPromise) {
        kvPromise = (async () => {
            try {
                // @vercel/kv はオプショナルな依存関係のため、動的インポートを使用
                const kvModule = await import('@vercel/kv').catch(() => null);
                if (kvModule && 'kv' in kvModule) {
                    return kvModule.kv as VercelKV;
                }
            } catch (error) {
                console.warn('@vercel/kv is not available, metadata tracking will be skipped', error);
            }
            return null;
        })();
    }
    return kvPromise;
}
