export type Language = 'ja-JP' | 'en-US';

export type VoiceModel = 'ja-JP-Standard-B' | 'en-US-Standard-C';

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
    playback_speed: 1.0,
    voice_model: 'ja-JP-Standard-B',
    language: 'ja-JP',
}

// 利用可能な音声モデル（将来の拡張に対応できる配列）
export const VOICE_MODELS: { value: VoiceModel; label: string }[] = [
    { value: 'ja-JP-Standard-B', label: '日本語 女性 B' },
    { value: 'en-US-Standard-C', label: 'English Female C' },
];
