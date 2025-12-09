import { selectVoiceModel } from '../voiceSelector';
import { type DetectedLanguage } from '../languageDetector';

describe('selectVoiceModel', () => {
  it('ユーザーが日本語音声を選択し、言語が英語の場合、英語音声を返す', () => {
    const userVoiceModel = 'ja-JP-Wavenet-B';
    const detectedLanguage: DetectedLanguage = 'en';
    const result = selectVoiceModel(userVoiceModel, detectedLanguage);
    expect(result).toBe('en-US-Wavenet-C');
  });

  it('ユーザーが日本語音声を選択し、言語が日本語の場合、日本語音声を返す', () => {
    const userVoiceModel = 'ja-JP-Wavenet-B';
    const detectedLanguage: DetectedLanguage = 'ja';
    const result = selectVoiceModel(userVoiceModel, detectedLanguage);
    expect(result).toBe(userVoiceModel);
  });

  it('ユーザーが日本語音声を選択し、言語が不明の場合、日本語音声を返す', () => {
    const userVoiceModel = 'ja-JP-Wavenet-B';
    const detectedLanguage: DetectedLanguage = 'unknown';
    const result = selectVoiceModel(userVoiceModel, detectedLanguage);
    expect(result).toBe(userVoiceModel);
  });

  it('ユーザーが英語音声を選択し、言語が英語の場合、英語音声を返す', () => {
    const userVoiceModel = 'en-US-Wavenet-C';
    const detectedLanguage: DetectedLanguage = 'en';
    const result = selectVoiceModel(userVoiceModel, detectedLanguage);
    expect(result).toBe(userVoiceModel);
  });

  it('ユーザーが英語音声を選択し、言語が日本語の場合、英語音声を返す', () => {
    const userVoiceModel = 'en-US-Wavenet-C';
    const detectedLanguage: DetectedLanguage = 'ja';
    const result = selectVoiceModel(userVoiceModel, detectedLanguage);
    expect(result).toBe(userVoiceModel);
  });
});
