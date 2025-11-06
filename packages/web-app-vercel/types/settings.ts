export type Language = 'ja-JP' | 'en-US';

export type VoiceModel =
    // 日本語
    | 'ja-JP-Standard-B'
    | 'ja-JP-Standard-C'
    | 'ja-JP-Standard-D'
    // 英語（米国）
    | 'en-US-Standard-C'
    | 'en-US-Standard-D'
    | 'en-US-Standard-A';

export interface UserSettings {
    playback_speed: number
    voice_model: VoiceModel
    language: Language
}

export interface UserSettingsResponse {
    playback_speed: number
    voice_model: VoiceModel
    language: Language
    created_at?: string
    updated_at?: string
}

export interface UpdateSettingsRequest {
    playback_speed?: number
    voice_model?: VoiceModel
    language?: Language
}

export interface UpdateSettingsResponse {
    success: boolean
    message?: string
    error?: string
}

export const DEFAULT_SETTINGS: UserSettings = {
    playback_speed: 2.0,
    voice_model: 'ja-JP-Standard-B',
    language: 'ja-JP',
}

// 言語ごとの音声モデルマッピング
export const VOICE_MODELS_BY_LANGUAGE: Record<Language, { value: VoiceModel; label: string }[]> = {
    'ja-JP': [
        { value: 'ja-JP-Standard-B', label: '日本語 女性 B（デフォルト）' },
        { value: 'ja-JP-Standard-C', label: '日本語 男性 C' },
        { value: 'ja-JP-Standard-D', label: '日本語 男性 D' },
    ],
    'en-US': [
        { value: 'en-US-Standard-C', label: 'English Female C (Default)' },
        { value: 'en-US-Standard-D', label: 'English Male D' },
        { value: 'en-US-Standard-A', label: 'English Male A' },
    ],
};
