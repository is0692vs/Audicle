import crypto from 'crypto';

/**
 * テキストのMD5ハッシュを計算（サーバーサイド用）
 */
export function calculateTextHash(text: string, index: number): string {
    return crypto.createHash('md5').update(`${text}:${index}`, 'utf8').digest('hex');
}
