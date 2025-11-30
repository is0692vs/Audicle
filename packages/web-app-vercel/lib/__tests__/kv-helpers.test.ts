import { parseArticleMetadata, serializeArticleMetadata } from '../kv-helpers';
import type { ArticleMetadata } from '@/types/cache';

describe('parseArticleMetadata', () => {
    it('should return null for null input', () => {
        expect(parseArticleMetadata(null)).toBeNull();
    });

    it('should return null for empty object', () => {
        expect(parseArticleMetadata({})).toBeNull();
    });

    it('should return null when articleUrl is missing', () => {
        expect(parseArticleMetadata({ totalChunks: 5 })).toBeNull();
    });

    it('should return null when articleUrl is empty string', () => {
        expect(parseArticleMetadata({ articleUrl: '' })).toBeNull();
    });

    it('should return null when articleUrl is not a string', () => {
        expect(parseArticleMetadata({ articleUrl: 123 })).toBeNull();
    });

    it('should return null when numeric fields are NaN', () => {
        expect(parseArticleMetadata({ 
            articleUrl: 'https://example.com',
            totalChunks: 'not-a-number'
        })).toBeNull();
    });

    it('should parse valid metadata correctly', () => {
        const input = {
            articleUrl: 'https://example.com/article',
            articleHash: 'abc123',
            voice: 'voice1',
            totalChunks: '10',
            readCount: '5',
            completedPlayback: 'true',
            lastPlayedChunk: '3',
            lastUpdated: '2024-01-01T00:00:00Z',
            lastAccessed: '2024-01-02T00:00:00Z',
        };

        const result = parseArticleMetadata(input);
        
        expect(result).toEqual({
            articleUrl: 'https://example.com/article',
            articleHash: 'abc123',
            voice: 'voice1',
            totalChunks: 10,
            readCount: 5,
            completedPlayback: true,
            lastPlayedChunk: 3,
            lastUpdated: '2024-01-01T00:00:00Z',
            lastAccessed: '2024-01-02T00:00:00Z',
        });
    });

    it('should handle missing optional fields with defaults', () => {
        const input = {
            articleUrl: 'https://example.com/article',
        };

        const result = parseArticleMetadata(input);
        
        expect(result).toEqual({
            articleUrl: 'https://example.com/article',
            articleHash: '',
            voice: '',
            totalChunks: 0,
            readCount: 0,
            completedPlayback: false,
            lastPlayedChunk: 0,
            lastUpdated: '',
            lastAccessed: '',
        });
    });

    it('should parse completedPlayback as false when not "true"', () => {
        const input = {
            articleUrl: 'https://example.com/article',
            completedPlayback: 'false',
        };

        const result = parseArticleMetadata(input);
        expect(result?.completedPlayback).toBe(false);
    });

    it('should parse numeric values from strings', () => {
        const input = {
            articleUrl: 'https://example.com/article',
            totalChunks: 15,
            readCount: 3,
            lastPlayedChunk: 7,
        };

        const result = parseArticleMetadata(input);
        expect(result?.totalChunks).toBe(15);
        expect(result?.readCount).toBe(3);
        expect(result?.lastPlayedChunk).toBe(7);
    });
});

describe('serializeArticleMetadata', () => {
    it('should return empty object for empty input', () => {
        expect(serializeArticleMetadata({})).toEqual({});
    });

    it('should serialize all fields correctly', () => {
        const metadata: ArticleMetadata = {
            articleUrl: 'https://example.com/article',
            articleHash: 'abc123',
            voice: 'voice1',
            totalChunks: 10,
            readCount: 5,
            completedPlayback: true,
            lastPlayedChunk: 3,
            lastUpdated: '2024-01-01T00:00:00Z',
            lastAccessed: '2024-01-02T00:00:00Z',
        };

        const result = serializeArticleMetadata(metadata);
        
        expect(result).toEqual({
            articleUrl: 'https://example.com/article',
            articleHash: 'abc123',
            voice: 'voice1',
            totalChunks: '10',
            readCount: '5',
            completedPlayback: 'true',
            lastPlayedChunk: '3',
            lastUpdated: '2024-01-01T00:00:00Z',
            lastAccessed: '2024-01-02T00:00:00Z',
        });
    });

    it('should only include defined fields', () => {
        const metadata: Partial<ArticleMetadata> = {
            articleUrl: 'https://example.com/article',
            totalChunks: 5,
        };

        const result = serializeArticleMetadata(metadata);
        
        expect(result).toEqual({
            articleUrl: 'https://example.com/article',
            totalChunks: '5',
        });
        expect(result).not.toHaveProperty('articleHash');
        expect(result).not.toHaveProperty('voice');
    });

    it('should serialize boolean values as strings', () => {
        const result = serializeArticleMetadata({ completedPlayback: false });
        expect(result.completedPlayback).toBe('false');
    });

    it('should serialize zero values', () => {
        const result = serializeArticleMetadata({ 
            totalChunks: 0,
            readCount: 0,
            lastPlayedChunk: 0,
        });
        expect(result.totalChunks).toBe('0');
        expect(result.readCount).toBe('0');
        expect(result.lastPlayedChunk).toBe('0');
    });
});
