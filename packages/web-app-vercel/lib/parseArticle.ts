import { parseHTML } from 'linkedom';

/**
 * article.content をパースしてプレーンテキスト化する
 * blockquote内のUI要素を除外し，段落間に適切な改行を挿入する（サーバーサイド用）
 */
export function normalizeArticleText(content: string): string {
    if (!content) return '';

    const { document } = parseHTML(content);

    // はてなブログなどにあるボタンやUI要素を削除
    document.querySelectorAll('button, .requote-button, .js-requote-button, nav, aside, footer').forEach(e => e.remove());

    const paragraphs: string[] = [];

    // blockquote内の<p>だけは内部の<br><br>で段落分割する
    const blockquoteParagraphs = document.querySelectorAll('blockquote p');
    blockquoteParagraphs.forEach(p => {
        // <br><br> をパラグラフ区切りとして扱う
        const html = p.innerHTML || '';
        const parts = html.split(/<br\s*\/?>(?:\s*<br\s*\/?>)+/i);
        parts.forEach(part => {
            const text = document.createElement('div');
            text.innerHTML = part;
            const t = text.textContent?.trim();
            if (t) paragraphs.push(t);
        });
        // 処理済みとして空にする（後続のpの二重処理を防ぐ）
        p.remove();
    });

    // 通常のブロック要素からテキストを抽出
    const selectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li'];
    const elements = document.querySelectorAll(selectors.join(','));
    elements.forEach(elem => {
        const text = elem.textContent?.trim();
        if (text) paragraphs.push(text);
    });

    // 段落間に空行を挿入
    return paragraphs.join('\n\n');
}

export default normalizeArticleText;
