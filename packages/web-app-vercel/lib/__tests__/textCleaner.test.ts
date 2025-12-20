import { removeSeparatorCharacters } from '../textCleaner';

describe('removeSeparatorCharacters', () => {
    it('should remove 10 consecutive equal signs', () => {
        const input = 'Step1: ========== 開始';
        const expected = 'Step1:  開始';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should remove 3 consecutive dashes from both sides', () => {
        const input = '--- セクション ---';
        const expected = ' セクション ';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should not remove 2 consecutive dashes', () => {
        const input = 'a--b';
        const expected = 'a--b';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should remove 3 consecutive tildes from both sides', () => {
        const input = '~~~注意~~~';
        const expected = '注意';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should not modify normal text', () => {
        const input = '通常のテキスト';
        const expected = '通常のテキスト';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should remove 3 consecutive hash signs from both sides', () => {
        const input = '###見出し###';
        const expected = '見出し';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should remove 3 consecutive underscores from both sides', () => {
        const input = '___下線___';
        const expected = '下線';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should remove 3 consecutive asterisks from both sides', () => {
        const input = '***強調***';
        const expected = '強調';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should handle multiple different separators in one text', () => {
        const input = '=== 見出し === --- 本文 ---';
        const expected = ' 見出し   本文 ';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should handle empty string', () => {
        const input = '';
        const expected = '';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should handle text with only separators', () => {
        const input = '=====';
        const expected = '';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should preserve exactly 2 consecutive characters', () => {
        const input = '== -- __ ** ~~ ##';
        const expected = '== -- __ ** ~~ ##';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should remove 4 consecutive equals signs', () => {
        const input = 'a====b';
        const expected = 'ab';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });

    it('should handle mixed consecutive separators correctly', () => {
        const input = '====----****テスト';
        const expected = 'テスト';
        expect(removeSeparatorCharacters(input)).toBe(expected);
    });
});
