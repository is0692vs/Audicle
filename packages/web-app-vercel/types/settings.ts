export type Language = 'ja-JP' | 'en-US';

export type VoiceModel = 'ja-JP-Wavenet-B' | 'en-US-Wavenet-C';

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

export interface UpdateSettingsSuccessResponse {
    success: true
    message: string
    data: UserSettingsResponse
}

export interface UpdateSettingsErrorResponse {
    success: false
    error: string
}

export type UpdateSettingsResponse = UpdateSettingsSuccessResponse | UpdateSettingsErrorResponse;

export const DEFAULT_SETTINGS: UserSettings = {
    playback_speed: 1.0,
    voice_model: 'ja-JP-Wavenet-B',
    language: 'ja-JP',
}

// 利用可能な音声モデル（将来の拡張に対応できる配列）
export const VOICE_MODELS: { value: VoiceModel; label: string }[] = [
    { value: 'ja-JP-Wavenet-B', label: '日本語 Wavenet B' },
    { value: 'en-US-Wavenet-C', label: 'English Wavenet C' },
];
