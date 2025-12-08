import { type DetectedLanguage } from './languageDetector';

const ENGLISH_VOICE_MODEL = 'en-US-Wavenet-C';

export function selectVoiceModel(
    userVoiceModel: string,
    detectedLanguage: DetectedLanguage
): string {
    const isJapaneseVoice = userVoiceModel.startsWith('ja-JP');

    if (isJapaneseVoice && detectedLanguage === 'en') {
        return ENGLISH_VOICE_MODEL;
    }

    return userVoiceModel;
}
