import { AudioCache } from '../audioCache';

// Mock synthesizeSpeech
jest.mock('../api', () => ({
    synthesizeSpeech: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'audio/wav' })),
}));

describe('AudioCache', () => {
    let cache: AudioCache;

    beforeEach(() => {
        cache = new AudioCache();
        // Clear cache before each test
        cache.clear();
    });

    describe('getCacheKey', () => {
        it('should generate consistent cache key for same inputs', () => {
            const instance = cache as unknown;
            const key1 = (instance as { getCacheKey: (text: string, voiceModel?: string, articleUrl?: string) => string }).getCacheKey('test text', 'voice1', 'url1');
            const key2 = (instance as { getCacheKey: (text: string, voiceModel?: string, articleUrl?: string) => string }).getCacheKey('test text', 'voice1', 'url1');
            expect(key1).toBe(key2);
        });

        it('should generate different keys for different text', () => {
            const instance = cache as unknown;
            const key1 = (instance as { getCacheKey: (text: string, voiceModel?: string, articleUrl?: string) => string }).getCacheKey('text1', 'voice1');
            const key2 = (instance as { getCacheKey: (text: string, voiceModel?: string, articleUrl?: string) => string }).getCacheKey('text2', 'voice1');
            expect(key1).not.toBe(key2);
        });

        it('should generate different keys for different voice models', () => {
            const instance = cache as unknown;
            const key1 = (instance as { getCacheKey: (text: string, voiceModel?: string, articleUrl?: string) => string }).getCacheKey('text', 'voice1');
            const key2 = (instance as { getCacheKey: (text: string, voiceModel?: string, articleUrl?: string) => string }).getCacheKey('text', 'voice2');
            expect(key1).not.toBe(key2);
        });

        it('should include articleUrl in key when provided', () => {
            const instance = cache as unknown;
            const key1 = (instance as { getCacheKey: (text: string, voiceModel?: string, articleUrl?: string) => string }).getCacheKey('text', 'voice1');
            const key2 = (instance as { getCacheKey: (text: string, voiceModel?: string, articleUrl?: string) => string }).getCacheKey('text', 'voice1', 'url1');
            expect(key1).not.toBe(key2);
            expect(key2).toContain('url1');
        });

        it('should handle empty string', () => {
            const instance = cache as unknown;
            const key = (instance as { getCacheKey: (text: string, voiceModel?: string, articleUrl?: string) => string }).getCacheKey('', 'voice1');
            expect(typeof key).toBe('string');
            expect(key).toContain('audio_');
        });

        it('should handle special characters', () => {
            const instance = cache as unknown;
            const key = (instance as { getCacheKey: (text: string, voiceModel?: string, articleUrl?: string) => string }).getCacheKey('特殊文字: !@#', 'voice1');
            expect(typeof key).toBe('string');
        });
    });

    describe('hashString', () => {
        it('should return a string hash', () => {
            const instance = cache as unknown;
            const hash = (instance as { hashString: (s: string) => string }).hashString('test');
            expect(typeof hash).toBe('string');
            expect(hash.length).toBeGreaterThan(0);
        });

        it('should produce consistent results', () => {
            const instance = cache as unknown;
            const hash1 = (instance as { hashString: (s: string) => string }).hashString('test');
            const hash2 = (instance as { hashString: (s: string) => string }).hashString('test');
            expect(hash1).toBe(hash2);
        });

        it('should produce different results for different strings', () => {
            const instance = cache as unknown;
            const hash1 = (instance as { hashString: (s: string) => string }).hashString('test1');
            const hash2 = (instance as { hashString: (s: string) => string }).hashString('test2');
            expect(hash1).not.toBe(hash2);
        });

        it('should handle empty string', () => {
            const instance = cache as unknown;
            const hash = (instance as { hashString: (s: string) => string }).hashString('');
            expect(typeof hash).toBe('string');
        });

        it('should handle long string', () => {
            const instance = cache as unknown;
            const longStr = 'a'.repeat(1000);
            const hash = (instance as { hashString: (s: string) => string }).hashString(longStr);
            expect(typeof hash).toBe('string');
        });
    });

    describe('get', () => {
        it('should call synthesizeSpeech on cache miss and return a blob URL', async () => {
            const { synthesizeSpeech } = require('../api');
            const url = await cache.get('test text', 'voice1', 'url1');
            expect(synthesizeSpeech).toHaveBeenCalledTimes(1);
            expect(synthesizeSpeech).toHaveBeenCalledWith('test text', 'voice1', 'url1');
            expect(url).toMatch(/^blob:/);
        });

        it('should not call synthesizeSpeech on cache hit', async () => {
            const { synthesizeSpeech } = require('../api');
            // Clear mocks to have a clean slate for this test
            (synthesizeSpeech as jest.Mock).mockClear();

            await cache.get('test text', 'voice1', 'url1'); // First call, miss
            await cache.get('test text', 'voice1', 'url1'); // Second call, hit
            expect(synthesizeSpeech).toHaveBeenCalledTimes(1);
        });
    });
});