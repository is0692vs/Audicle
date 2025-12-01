import { cn, extractDomain } from '../utils';

describe('cn', () => {
    it('should merge class names', () => {
        const result = cn('class1', 'class2');
        expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
        const result = cn('base', true && 'active', false && 'disabled');
        expect(result).toBe('base active');
    });

    it('should merge tailwind classes correctly', () => {
        const result = cn('px-2 py-1', 'px-4');
        expect(result).toBe('py-1 px-4');
    });

    it('should handle empty input', () => {
        const result = cn();
        expect(result).toBe('');
    });

    it('should handle undefined and null', () => {
        const result = cn('class1', undefined, null, 'class2');
        expect(result).toBe('class1 class2');
    });
});

describe('extractDomain', () => {
    it('should extract domain from valid URL', () => {
        const result = extractDomain('https://example.com/path');
        expect(result).toBe('example.com');
    });

    it('should extract domain with subdomain', () => {
        const result = extractDomain('https://www.example.com/path');
        expect(result).toBe('www.example.com');
    });

    it('should handle URL with port', () => {
        const result = extractDomain('https://example.com:8080/path');
        expect(result).toBe('example.com');
    });

    it('should return original string for invalid URL', () => {
        const result = extractDomain('not-a-valid-url');
        expect(result).toBe('not-a-valid-url');
    });

    it('should handle complex URLs', () => {
        const result = extractDomain('https://sub.example.co.jp/path?query=1');
        expect(result).toBe('sub.example.co.jp');
    });
});
