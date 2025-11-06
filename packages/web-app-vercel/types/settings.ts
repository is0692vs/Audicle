export type VoiceModel = 'ja-JP-Wavenet-A' | 'ja-JP-Wavenet-B' | 'ja-JP-Wavenet-C' | 'ja-JP-Wavenet-D'

export interface UserSettings {
    playback_speed: number
    voice_model: VoiceModel
}

export interface UserSettingsResponse {
    playback_speed: number
    voice_model: VoiceModel
    created_at?: string
    updated_at?: string
}

export interface UpdateSettingsRequest {
    playback_speed?: number
    voice_model?: VoiceModel
}

export interface UpdateSettingsResponse {
    success: boolean
    message?: string
}

export const DEFAULT_SETTINGS: UserSettings = {
    playback_speed: 2.0,
    voice_model: 'ja-JP-Wavenet-A',
}

export const VOICE_MODELS: VoiceModel[] = [
    'ja-JP-Wavenet-A',
    'ja-JP-Wavenet-B',
    'ja-JP-Wavenet-C',
    'ja-JP-Wavenet-D',
]
