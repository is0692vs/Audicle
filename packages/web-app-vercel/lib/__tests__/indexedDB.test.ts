import { generateKey } from '../indexedDB';

describe('generateKey', () => {
    it('should generate a key string', () => {
        const key = generateKey('http://example.com', 1, 'voice1');
        expect(typeof key).toBe('string');
        expect(key).toBe('http://example.com:1:voice1');
    });

    it('should use default voice when not provided', () => {
        const key = generateKey('http://example.com', 1);
        expect(key).toBe('http://example.com:1:default');
    });

    it('should produce consistent results', () => {
        const key1 = generateKey('url', 1, 'voice');
        const key2 = generateKey('url', 1, 'voice');
        expect(key1).toBe(key2);
    });

    it('should produce different keys for different urls', () => {
        const key1 = generateKey('url1', 1, 'voice');
        const key2 = generateKey('url2', 1, 'voice');
        expect(key1).not.toBe(key2);
    });

    it('should produce different keys for different chunk indices', () => {
        const key1 = generateKey('url', 1, 'voice');
        const key2 = generateKey('url', 2, 'voice');
        expect(key1).not.toBe(key2);
    });

    it('should produce different keys for different voice models', () => {
        const key1 = generateKey('url', 1, 'voice1');
        const key2 = generateKey('url', 1, 'voice2');
        expect(key1).not.toBe(key2);
    });

    it('should handle empty string url', () => {
        const key = generateKey('', 1, 'voice');
        expect(key).toBe(':1:voice');
    });

    it('should handle zero chunk index', () => {
        const key = generateKey('url', 0, 'voice');
        expect(key).toBe('url:0:voice');
    });

    it('should handle special characters in url', () => {
        const key = generateKey('http://example.com/path?query=value', 1, 'voice');
        expect(key).toBe('http://example.com/path?query=value:1:voice');
    });
});