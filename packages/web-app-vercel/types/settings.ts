export type Language = 'ja-JP' | 'en-US';

export type VoiceModel = 'ja-JP-Standard-B' | 'en-US-Wavenet-C';

export type ColorTheme = 'ocean' | 'purple' | 'forest' | 'rose' | 'orange';

export interface UserSettings {
    playback_speed: number
    voice_model: VoiceModel
    language: Language
    color_theme: ColorTheme
}

export interface UserSettingsResponse {
    playback_speed: number
    voice_model: VoiceModel
    language: Language
    color_theme: ColorTheme
    created_at?: string
    updated_at?: string
}

export interface UpdateSettingsRequest {
    playback_speed?: number
    voice_model?: VoiceModel
    language?: Language
    color_theme?: ColorTheme
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
    voice_model: 'ja-JP-Standard-B',
    language: 'ja-JP',
    color_theme: 'ocean',
}

// 利用可能な音声モデル（将来の拡張に対応できる配列）
export const VOICE_MODELS: { value: VoiceModel; label: string }[] = [
    { value: 'ja-JP-Standard-B', label: '日本語 Standard B' },
    { value: 'en-US-Wavenet-C', label: 'English Wavenet C' },
];

// 利用可能なカラーテーマ
export const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
    { value: 'ocean', label: 'Ocean', color: 'hsl(199 89% 48%)' },
    { value: 'purple', label: 'Purple', color: 'hsl(262 83% 58%)' },
    { value: 'forest', label: 'Forest', color: 'hsl(142 76% 36%)' },
    { value: 'rose', label: 'Rose', color: 'hsl(346 77% 50%)' },
    { value: 'orange', label: 'Orange', color: 'hsl(25 95% 53%)' },
];
