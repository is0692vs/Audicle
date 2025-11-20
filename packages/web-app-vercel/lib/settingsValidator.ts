import { UserSettings, VoiceModel, Language, ColorTheme, VOICE_MODELS, COLOR_THEMES } from '@/types/settings'

const VALID_VOICE_MODELS: VoiceModel[] = VOICE_MODELS.map(m => m.value);
const VALID_COLOR_THEMES: ColorTheme[] = COLOR_THEMES.map(m => m.value);

const VALID_LANGUAGES = ['ja-JP', 'en-US'] as const;

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
    return VALID_VOICE_MODELS.includes(model as VoiceModel)
}

/**
 * Validate language
 * @param language - Language to validate
 */
export function validateLanguage(language: unknown): language is Language {
    return VALID_LANGUAGES.includes(language as Language)
}

/**
 * Validate color theme
 * @param theme - Color theme to validate
 */
export function validateColorTheme(theme: unknown): theme is ColorTheme {
    return VALID_COLOR_THEMES.includes(theme as ColorTheme)
}

/**
 * Validate complete UserSettings object
 */
export function validateUserSettings(data: unknown): data is UserSettings {
    if (!data || typeof data !== 'object') return false

    const settings = data as Record<string, unknown>

    return (
        validatePlaybackSpeed(settings.playback_speed) &&
        validateVoiceModel(settings.voice_model) &&
        validateLanguage(settings.language) &&
        validateColorTheme(settings.color_theme)
    )
}
