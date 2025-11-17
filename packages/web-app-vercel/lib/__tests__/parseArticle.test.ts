import { normalizeArticleText } from '@/lib/parseArticle';

describe('normalizeArticleText', () => {
    it('Qiita風のblockquoteを正しく処理する', () => {
        const html = `
      <blockquote>
        <p>テキスト1<br><br>テキスト2<br><br>テキスト3</p>
      </blockquote>
    `;

        const result = normalizeArticleText(html);
        expect(result).toBe('テキスト1\n\nテキスト2\n\nテキスト3');
    });

    it('はてなブログ風のUI要素を除外する', () => {
        const html = `
      <blockquote>
        <p>引用テキスト</p>
        <div class="requote-button">
          <button>引用する</button>
        </div>
      </blockquote>
    `;

        const result = normalizeArticleText(html);
        expect(result).toBe('引用テキスト');
        expect(result).not.toContain('引用する');
    });

    it('見出しと段落を適切に処理する', () => {
        const html = `
      <h2>見出し</h2>
      <p>段落1</p>
      <p>段落2</p>
    `;

        const result = normalizeArticleText(html);
        expect(result).toBe('見出し\n\n段落1\n\n段落2');
    });
});
