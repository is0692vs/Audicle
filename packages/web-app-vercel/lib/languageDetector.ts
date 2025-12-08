export type DetectedLanguage = 'ja' | 'en' | 'unknown';

export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.length === 0) return 'unknown';

  const japaneseChars = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || [];
  const japaneseRatio = japaneseChars.length / text.length;

  if (japaneseRatio > 0.1) return 'ja';
  if (japaneseRatio < 0.01) return 'en';
  return 'unknown';
}
