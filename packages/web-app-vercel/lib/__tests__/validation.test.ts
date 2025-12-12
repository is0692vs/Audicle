
import { isValidVoice, isValidSpeakingRate } from '../validation';

describe('Validation Utils', () => {
    describe('isValidVoice', () => {
        it('should validate correct voice names', () => {
            expect(isValidVoice('ja-JP-Standard-B')).toBe(true);
            expect(isValidVoice('en-US-Neural2-F')).toBe(true);
            expect(isValidVoice('en-GB-Standard-A')).toBe(true);
            expect(isValidVoice('Standard-B')).toBe(true);
        });

        it('should reject invalid characters', () => {
            expect(isValidVoice('ja-JP-Standard-B/../')).toBe(false);
            expect(isValidVoice('ja-JP-Standard-B; rm -rf')).toBe(false);
            expect(isValidVoice('<script>')).toBe(false);
            expect(isValidVoice('foo bar')).toBe(false); // Spaces not allowed
        });

        it('should reject empty or non-string inputs', () => {
            expect(isValidVoice('')).toBe(false);
            // @ts-ignore
            expect(isValidVoice(null)).toBe(false);
            // @ts-ignore
            expect(isValidVoice(undefined)).toBe(false);
            // @ts-ignore
            expect(isValidVoice(123)).toBe(false);
        });

        it('should reject overly long strings', () => {
            const longString = 'a'.repeat(65);
            expect(isValidVoice(longString)).toBe(false);
        });
    });

    describe('isValidSpeakingRate', () => {
        it('should accept valid rates', () => {
            expect(isValidSpeakingRate(1.0)).toBe(true);
            expect(isValidSpeakingRate(0.25)).toBe(true);
            expect(isValidSpeakingRate(4.0)).toBe(true);
            expect(isValidSpeakingRate(2.5)).toBe(true);
        });

        it('should reject out of range rates', () => {
            expect(isValidSpeakingRate(0.1)).toBe(false);
            expect(isValidSpeakingRate(4.1)).toBe(false);
            expect(isValidSpeakingRate(-1.0)).toBe(false);
        });

        it('should reject non-numbers', () => {
            // @ts-ignore
            expect(isValidSpeakingRate('1.0')).toBe(false);
            expect(isValidSpeakingRate(NaN)).toBe(false);
        });
    });
});
