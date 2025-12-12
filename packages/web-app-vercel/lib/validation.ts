
/**
 * Validates a voice model string.
 * Allows alphanumeric characters and hyphens.
 * Example: 'ja-JP-Standard-B', 'en-US-Neural2-A'
 */
export function isValidVoice(voice: string): boolean {
    if (!voice || typeof voice !== 'string') {
        return false;
    }
    // Allow only alphanumeric characters and hyphens
    // Length check: typical voice names are around 10-30 chars. Max 64 is safe buffer.
    const voiceRegex = /^[a-zA-Z0-9-]{1,64}$/;
    return voiceRegex.test(voice);
}

/**
 * Validates speaking rate.
 * Google Cloud TTS typically accepts 0.25 to 4.0.
 */
export function isValidSpeakingRate(rate: number): boolean {
    if (typeof rate !== 'number' || isNaN(rate)) {
        return false;
    }
    return rate >= 0.25 && rate <= 4.0;
}
