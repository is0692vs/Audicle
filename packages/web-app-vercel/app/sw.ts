import { defaultCache } from "@serwist/next/worker";
import {
    Serwist,
    CacheFirst,
    NetworkFirst,
    ExpirationPlugin,
    type RuntimeCaching,
    type PrecacheEntry,
    type SerwistGlobalConfig,
} from "serwist";

// `injectionPoint` will be replaced by the precache manifest by @serwist/next
declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const cacheStrategies: RuntimeCaching[] = [
    {
        matcher: ({ url }) => url.protocol.startsWith("http") && !url.pathname.startsWith("/api/"),
        handler: new CacheFirst({
            cacheName: "staticCache",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 60,
                    maxAgeSeconds: 24 * 60 * 60,
                }),
            ],
        }),
    },
    {
        matcher: ({ url }) => url.pathname.startsWith("/api/"),
        handler: new NetworkFirst({
            cacheName: "apiCache",
            networkTimeoutSeconds: 5,
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60,
                }),
            ],
        }),
    },
];

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [...cacheStrategies, ...defaultCache],
});

serwist.addEventListeners();
