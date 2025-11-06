import { UserSettings, VoiceModel } from '@/types/settings'

/**
 * Validate playback speed
 * @param speed - Playback speed to validate (should be between 0.5 and 3.0)
 */
export function validatePlaybackSpeed(speed: unknown): boolean {
    if (typeof speed !== 'number') return false
    return speed >= 0.5 && speed <= 3.0
}

/**
 * Validate voice model
 * @param model - Voice model to validate
 */
export function validateVoiceModel(model: unknown): model is VoiceModel {
    const validModels: VoiceModel[] = [
        'ja-JP-Wavenet-A',
        'ja-JP-Wavenet-B',
        'ja-JP-Wavenet-C',
        'ja-JP-Wavenet-D',
    ]
    return validModels.includes(model as VoiceModel)
}

/**
 * Validate complete UserSettings object
 */
export function validateUserSettings(data: unknown): data is UserSettings {
    if (!data || typeof data !== 'object') return false

    const settings = data as Record<string, unknown>

    return (
        validatePlaybackSpeed(settings.playback_speed) &&
        validateVoiceModel(settings.voice_model)
    )
}
