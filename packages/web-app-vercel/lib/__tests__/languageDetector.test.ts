import { detectLanguage } from '../languageDetector';

describe('detectLanguage', () => {
  it('returns ja for Japanese text', () => {
    const text = 'これは日本語の文章です。ひらがなとカタカナ、漢字が含まれます。';
    expect(detectLanguage(text)).toBe('ja');
  });

  it('returns en for English text', () => {
    const text = 'This is an English sentence with no Japanese characters at all.';
    expect(detectLanguage(text)).toBe('en');
  });

  it('returns ja for mixed but Japanese-dominant text', () => {
    const text = 'メインはJapaneseですが English words are here.';
    expect(detectLanguage(text)).toBe('ja');
  });

  it('returns unknown for empty text', () => {
    expect(detectLanguage('')).toBe('unknown');
  });
});
