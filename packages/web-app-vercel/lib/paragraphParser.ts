/**
 * 段落パーサー
 * HTMLから段落単位でテキストを抽出し、各段落に情報を付与する
 */

export interface Paragraph {
  id: string; // 段落ID（連番）
  type: string; // 要素タイプ（p, h1, h2, li等）
  originalText: string; // 元のテキスト（表示用）
  cleanedText: string; // クリーンアップ済みテキスト（TTS送信用）
}

/**
 * HTMLからテキストを抽出し、段落単位で分割する
 * @param htmlContent Readability.jsの.contentで取得したHTML文字列
 * @returns 段落情報の配列
 */
export function parseHTMLToParagraphs(htmlContent: string): Paragraph[] {
  // DOMパーサーを使用してHTMLを解析
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const paragraphs: Paragraph[] = [];
  let idCounter = 0;

  // 抽出対象の要素セレクタ
  const selectors = [
    'p',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'li',
    'blockquote'
  ];

  // すべての対象要素を順番に処理
  const elements = doc.querySelectorAll(selectors.join(','));
  
  elements.forEach((element) => {
    const text = element.textContent?.trim() || '';
    
    // 空の要素はスキップ
    if (!text) return;
    
    const tagName = element.tagName.toLowerCase();
    
    paragraphs.push({
      id: `para-${idCounter++}`,
      type: tagName,
      originalText: text,
      cleanedText: cleanText(text),
    });
  });

  return paragraphs;
}

/**
 * テキストをクリーンアップする（TTS送信用）
 * - Markdown記法を削除
 * - HTML実体参照を変換
 * - 連続空白を正規化
 * - URLを短縮
 * - 前後の空白をトリム
 */
function cleanText(text: string): string {
  let cleaned = text;

  // HTML実体参照を変換
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'");

  // Markdown記法を削除
  // 太字: **text** or __text__
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');
  
  // 斜体: *text* or _text_
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
  cleaned = cleaned.replace(/_(.+?)_/g, '$1');
  
  // 打ち消し: ~~text~~
  cleaned = cleaned.replace(/~~(.+?)~~/g, '$1');
  
  // インラインコード: `code`
  cleaned = cleaned.replace(/`(.+?)`/g, '$1');
  
  // 見出し: # text
  cleaned = cleaned.replace(/^#+\s+/gm, '');
  
  // リンク: [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // URL短縮: https://example.com/path/to/page -> example.com
  cleaned = cleaned.replace(/https?:\/\/([^\/\s]+)([^\s]*)/g, (match, domain) => {
    return domain; // ドメイン名のみ残す
  });

  // 連続空白を1つに正規化
  cleaned = cleaned.replace(/\s+/g, ' ');

  // 前後の空白をトリム
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * ポーズが必要な段落タイプかどうか判定
 */
export function needsPauseBefore(type: string): boolean {
  return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(type);
}

export function needsPauseAfter(type: string): boolean {
  return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(type);
}

/**
 * ポーズ時間を取得（ミリ秒）
 */
export function getPauseDuration(type: 'heading' | 'paragraph'): number {
  if (type === 'heading') {
    return 500; // 見出しの前後: 500ms
  }
  return 300; // 段落間: 300ms
}
