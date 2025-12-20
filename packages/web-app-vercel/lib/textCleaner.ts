/**
 * TTS APIに送信する前にセパレータ文字を除去する
 * 特定の記号文字が3回以上連続する部分を除去する
 * 
 * 対象文字: =, -, _, *, ~, #
 * 
 * @param text - クリーニング対象のテキスト
 * @returns セパレータ文字が除去されたテキスト
 */
export function removeSeparatorCharacters(text: string): string {
    // 対象: =, -, _, *, ~, #
    // 各記号が3回以上連続する部分を除去する
    return text.replace(/([=\-_*~#])\1{2,}/g, '');
}
