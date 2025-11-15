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
            const instance = cache as any;
            const key1 = instance.getCacheKey('test text', 'voice1', 'url1');
            const key2 = instance.getCacheKey('test text', 'voice1', 'url1');
            expect(key1).toBe(key2);
        });

        it('should generate different keys for different text', () => {
            const instance = cache as any;
            const key1 = instance.getCacheKey('text1', 'voice1');
            const key2 = instance.getCacheKey('text2', 'voice1');
            expect(key1).not.toBe(key2);
        });

        it('should generate different keys for different voice models', () => {
            const instance = cache as any;
            const key1 = instance.getCacheKey('text', 'voice1');
            const key2 = instance.getCacheKey('text', 'voice2');
            expect(key1).not.toBe(key2);
        });

        it('should include articleUrl in key when provided', () => {
            const instance = cache as any;
            const key1 = instance.getCacheKey('text', 'voice1');
            const key2 = instance.getCacheKey('text', 'voice1', 'url1');
            expect(key1).not.toBe(key2);
            expect(key2).toContain('url1');
        });

        it('should handle empty string', () => {
            const instance = cache as any;
            const key = instance.getCacheKey('', 'voice1');
            expect(typeof key).toBe('string');
            expect(key).toContain('audio_');
        });

        it('should handle special characters', () => {
            const instance = cache as any;
            const key = instance.getCacheKey('特殊文字: !@#', 'voice1');
            expect(typeof key).toBe('string');
        });
    });

    describe('hashString', () => {
        it('should return a string hash', () => {
            const instance = cache as any;
            const hash = instance.hashString('test');
            expect(typeof hash).toBe('string');
            expect(hash.length).toBeGreaterThan(0);
        });

        it('should produce consistent results', () => {
            const instance = cache as any;
            const hash1 = instance.hashString('test');
            const hash2 = instance.hashString('test');
            expect(hash1).toBe(hash2);
        });

        it('should produce different results for different strings', () => {
            const instance = cache as any;
            const hash1 = instance.hashString('test1');
            const hash2 = instance.hashString('test2');
            expect(hash1).not.toBe(hash2);
        });

        it('should handle empty string', () => {
            const instance = cache as any;
            const hash = instance.hashString('');
            expect(typeof hash).toBe('string');
        });

        it('should handle long string', () => {
            const instance = cache as any;
            const longStr = 'a'.repeat(1000);
            const hash = instance.hashString(longStr);
            expect(typeof hash).toBe('string');
        });
    });

    // Note: get method testing would require mocking synthesizeSpeech properly,
    // but since it's async and involves external API, we'll skip for now.
    // In a real scenario, we'd mock it and test cache hit/miss.
});