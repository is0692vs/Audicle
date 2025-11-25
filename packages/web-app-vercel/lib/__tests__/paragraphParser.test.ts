import {
    parseHTMLToParagraphs,
    // 内部関数をテスト用にエクスポートする必要があるため、
    // テストファイルを別の形式で作成
} from '../paragraphParser';

/**
 * paragraphParser のチャンクリサイズ機能のテスト
 */
describe('paragraphParser', () => {
    describe('parseHTMLToParagraphs', () => {
        it('should parse simple HTML to paragraphs', () => {
            const html = '<p>こんにちは</p><p>世界</p>';
            const result = parseHTMLToParagraphs(html);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle empty HTML', () => {
            const result = parseHTMLToParagraphs('');
            expect(result).toEqual([]);
        });
    });

    describe('chunk resizing', () => {
        it('should split text exceeding 5000 bytes at punctuation', () => {
            // 日本語の「あ」は3バイト、1667文字で約5000バイト
            // 安全上限は4800バイトなので、1600文字を超える場合はリサイズされる
            const longJapaneseText = 'あ'.repeat(1700); // 約5100バイト
            const longTextWithPunctuation = `${longJapaneseText.slice(0, 800)}。${longJapaneseText.slice(801)}`;

            const html = `<p>${longTextWithPunctuation}</p>`;
            const result = parseHTMLToParagraphs(html);

            // リサイズされて複数のチャンクに分割されるはず
            expect(result.length).toBeGreaterThan(1);

            // 各チャンクが安全サイズ内であることを確認
            for (const chunk of result) {
                const byteSize = Buffer.byteLength(chunk.cleanedText, 'utf-8');
                expect(byteSize).toBeLessThanOrEqual(4800);
            }
        });

        it('should split text by commas when no period is available', () => {
            // 句点なしで読点ありのテキスト
            const longText = 'あ'.repeat(500) + '、' + 'い'.repeat(500) + '、' + 'う'.repeat(500) + '、' + 'え'.repeat(500);

            const html = `<p>${longText}</p>`;
            const result = parseHTMLToParagraphs(html);

            // 複数のチャンクに分割されるはず
            expect(result.length).toBeGreaterThan(1);
        });

        it('should force split text without any delimiters', () => {
            // 区切り文字なしの長いテキスト（日本語のみ）
            const longTextNoDelimiter = 'あ'.repeat(2000); // 約6000バイト

            const html = `<p>${longTextNoDelimiter}</p>`;
            const result = parseHTMLToParagraphs(html);

            // フォーススプリットで分割されるはず
            expect(result.length).toBeGreaterThan(1);

            // 各チャンクが安全サイズ内であることを確認
            for (const chunk of result) {
                const byteSize = Buffer.byteLength(chunk.cleanedText, 'utf-8');
                expect(byteSize).toBeLessThanOrEqual(4800);
            }
        });

        it('should not split text under 4800 bytes', () => {
            // 短いテキスト（安全上限以下）
            const shortText = 'こんにちは世界';

            const html = `<p>${shortText}</p>`;
            const result = parseHTMLToParagraphs(html);

            // 1つのチャンクのまま
            expect(result.length).toBe(1);
            expect(result[0].cleanedText).toBe(shortText);
        });

        it('should handle mixed Japanese and English text', () => {
            // 日英混合の長いテキスト
            const mixedText = ('日本語テキスト. English text. ' + 'あ'.repeat(200)).repeat(10);

            const html = `<p>${mixedText}</p>`;
            const result = parseHTMLToParagraphs(html);

            // 各チャンクが安全サイズ内であることを確認
            for (const chunk of result) {
                const byteSize = Buffer.byteLength(chunk.cleanedText, 'utf-8');
                expect(byteSize).toBeLessThanOrEqual(4800);
            }
        });

        it('should preserve delimiter priority (。 > 、 > .)', () => {
            // 句点、読点、ピリオドを含むテキスト
            // 約5000バイト超えになるようにして、句点で分割されることを確認
            const text = 'あ'.repeat(800) + '。' + 'い'.repeat(800) + '、' + 'う'.repeat(800);

            const html = `<p>${text}</p>`;
            const result = parseHTMLToParagraphs(html);

            // 分割されているはず
            expect(result.length).toBeGreaterThan(1);

            // 最初のチャンクは句点で終わるはず（優先度が高いため）
            if (result.length >= 2) {
                expect(result[0].cleanedText.endsWith('。')).toBe(true);
            }
        });
    });
});
