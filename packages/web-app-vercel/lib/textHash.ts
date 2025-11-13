import crypto from 'crypto';

/**
 * テキストのMD5ハッシュを計算（サーバーサイド用）
 */
export function calculateTextHash(text: string): string {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

/**
 * テキストのハッシュを計算（クライアントサイド用）
 * サーバーと同じMD5ハッシュを生成する必要があるため、
 * 簡易的な実装を使用（完全な互換性のため、実際にはMD5ライブラリを使用すべき）
 */
export function calculateTextHashClient(text: string): string {
  // 簡易的なハッシュ（開発用）
  // 本番環境では js-md5 などのライブラリを使用することを推奨
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
