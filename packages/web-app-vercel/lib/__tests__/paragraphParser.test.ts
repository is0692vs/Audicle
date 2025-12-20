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
            const { paragraphs } = parseHTMLToParagraphs(html);
            expect(paragraphs.length).toBeGreaterThan(0);
        });

        it('should handle empty HTML', () => {
            const result = parseHTMLToParagraphs('');
            expect(result.paragraphs).toEqual([]);
        });

        it('should not duplicate content from p tags inside blockquotes', () => {
            const html = '<blockquote><p>This is a quote.</p></blockquote><p>This is a paragraph.</p>';
            const { paragraphs } = parseHTMLToParagraphs(html);
            expect(paragraphs.length).toBe(2);
            expect(paragraphs[0].type).toBe('blockquote');
            expect(paragraphs[0].originalText).toBe('This is a quote.');
            expect(paragraphs[1].type).toBe('p');
            expect(paragraphs[1].originalText).toBe('This is a paragraph.');
        });

        it('should handle nested blockquote with multiple p tags', () => {
            const html = '<blockquote><p>Quote line 1</p><p>Quote line 2</p></blockquote>';
            const { paragraphs } = parseHTMLToParagraphs(html);
            // blockquote全体が1つの段落として抽出される（内部のpは個別に抽出されない）
            expect(paragraphs.length).toBe(1);
            expect(paragraphs[0].type).toBe('blockquote');
            expect(paragraphs[0].originalText).toContain('Quote line 1');
            expect(paragraphs[0].originalText).toContain('Quote line 2');
        });

        it('should extract code blocks (pre elements)', () => {
            const html = '<p>コード例：</p><pre><code>function hello() {\n  console.log("Hello");\n}</code></pre><p>以上です。</p>';
            const { paragraphs } = parseHTMLToParagraphs(html);
            expect(paragraphs.length).toBe(3);
            expect(paragraphs[0].originalText).toBe('コード例：');
            expect(paragraphs[1].type).toBe('pre');
            expect(paragraphs[1].originalText).toContain('function hello()');
            expect(paragraphs[2].originalText).toBe('以上です。');
        });

        it('コードブロックを含む日本語記事でjaと判定されること', () => {
            const html = `
                <p>これはJavaScriptの解説です。</p>
                <pre><code>function test() { return 1; }</code></pre>
                <p>以上です。</p>
            `;
            const result = parseHTMLToParagraphs(html);
            expect(result.detectedLanguage).toBe('ja');
        });

        it('コードブロックのみでも誤判定しないこと', () => {
            const html = `
                <p>コード例：</p>
                <pre><code>const a = 1; const b = 2; const c = a + b;</code></pre>
            `;
            const result = parseHTMLToParagraphs(html);
            expect(result.detectedLanguage).toBe('ja');
        });

        it('should extract table cells (td/th elements)', () => {
            const html = '<table><tr><th>項目</th><th>値</th></tr><tr><td>名前</td><td>テスト</td></tr></table>';
            const { paragraphs } = parseHTMLToParagraphs(html);
            expect(paragraphs.length).toBeGreaterThanOrEqual(4);
            const texts = paragraphs.map(p => p.originalText);
            expect(texts).toContain('項目');
            expect(texts).toContain('値');
            expect(texts).toContain('名前');
            expect(texts).toContain('テスト');
        });

        it('should extract figcaption', () => {
            const html = '<figure><img src="test.png" /><figcaption>図1: テスト画像</figcaption></figure>';
            const { paragraphs } = parseHTMLToParagraphs(html);
            expect(paragraphs.length).toBe(1);
            expect(paragraphs[0].type).toBe('figcaption');
            expect(paragraphs[0].originalText).toBe('図1: テスト画像');
        });

        it('should fallback to body text when no block elements found', () => {
            const html = '<div>直接のテキスト内容</div>';
            const { paragraphs } = parseHTMLToParagraphs(html);
            expect(paragraphs.length).toBeGreaterThanOrEqual(1);
            expect(paragraphs.some(p => p.originalText.includes('直接のテキスト内容'))).toBe(true);
        });
    });

    describe('repeated symbol skipping', () => {
        it.each([
            { symbol: '=', name: 'equal signs', displayName: 'イコール' },
            { symbol: '-', name: 'dashes', displayName: 'ダッシュ' },
            { symbol: '*', name: 'asterisks', displayName: 'アスタリスク' },
            { symbol: '_', name: 'underscores', displayName: 'アンダースコア' },
            { symbol: '#', name: 'hash symbols', displayName: 'ハッシュ' },
            { symbol: '~', name: 'tildes', displayName: 'チルダ' },
        ])('should skip lines with repeated $name', ({ symbol }) => {
            const separator = symbol.repeat(10);
            const html = `<p>見出し</p><p>${separator}</p><p>本文</p>`;
            const { paragraphs } = parseHTMLToParagraphs(html);

            expect(paragraphs.length).toBe(3);
            expect(paragraphs[0].cleanedText).toBe('見出し');
            expect(paragraphs[1].cleanedText).toBe('');
            expect(paragraphs[2].cleanedText).toBe('本文');
        });

        it('should not skip lines with less than 3 repeated symbols', () => {
            const html = '<p>段落1</p><p>==</p><p>段落2</p>';
            const { paragraphs } = parseHTMLToParagraphs(html);

            // 2つの記号は残る（スキップされない）
            expect(paragraphs.length).toBe(3);
            expect(paragraphs[1].cleanedText).toBe('==');
        });

        it('should not skip lines with mixed content', () => {
            const html = '<p>テキスト === more text</p>';
            const { paragraphs } = parseHTMLToParagraphs(html);

            // 混在したコンテンツはスキップされない
            expect(paragraphs.length).toBe(1);
            expect(paragraphs[0].cleanedText).not.toBe('');
            expect(paragraphs[0].cleanedText).toContain('テキスト');
        });

        it('should handle Qiita-style separator lines', () => {
            const html = `
                <h2>見出し</h2>
                <p>============</p>
                <p>本文が続きます。</p>
            `;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // 見出し、区切り線（空）、本文
            expect(paragraphs.length).toBe(3);
            expect(paragraphs[0].type).toBe('h2');
            expect(paragraphs[0].cleanedText).toBe('見出し');
            expect(paragraphs[1].cleanedText).toBe('');
            expect(paragraphs[2].cleanedText).toBe('本文が続きます。');
        });

        it('should handle very long repeated symbol lines', () => {
            const html = `<p>${'='.repeat(100)}</p>`;
            const { paragraphs } = parseHTMLToParagraphs(html);

            expect(paragraphs.length).toBe(1);
            expect(paragraphs[0].cleanedText).toBe('');
        });

        it('should correctly filter separators for TTS request with Qiita-style article', () => {
            // Qiita記事の典型的な構造（複数のセパレータを含む）
            const html = `
                <h2>Phase 1: 基本機能の実装</h2>
                <p>============</p>
                <p>まず最初に、基本的な機能を実装します。</p>
                <p>以下の要点を含みます：</p>
                <p>-----------</p>
                <p>1. テキストの抽出</p>
                <p>2. 画像の処理</p>
                <p>***********</p>
                <p>詳細については別のセクションで説明します。</p>
                <h2>Phase 2: 最適化</h2>
                <p>___________</p>
                <p>パフォーマンスを改善するために最適化を行います。</p>
                <p>~~~~~~~~~~~</p>
                <p>完了しました。</p>
            `;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // クリーンアップされたテキストを取得（空文字列でないもののみ）
            const ttsReadableText = paragraphs
                .filter(p => p.cleanedText.trim() !== '')
                .map(p => p.cleanedText)
                .join(' ');

            // TTSで読み上げられるべき内容のみが含まれていることを確認
            expect(ttsReadableText).toContain('Phase 1: 基本機能の実装');
            expect(ttsReadableText).toContain('まず最初に、基本的な機能を実装します。');
            expect(ttsReadableText).toContain('以下の要点を含みます：');
            expect(ttsReadableText).toContain('1. テキストの抽出');
            expect(ttsReadableText).toContain('2. 画像の処理');
            expect(ttsReadableText).toContain('詳細については別のセクションで説明します。');
            expect(ttsReadableText).toContain('Phase 2: 最適化');
            expect(ttsReadableText).toContain('パフォーマンスを改善するために最適化を行います。');
            expect(ttsReadableText).toContain('完了しました。');

            // セパレータは含まれていないことを確認
            expect(ttsReadableText).not.toContain('============');
            expect(ttsReadableText).not.toContain('-----------');
            expect(ttsReadableText).not.toContain('***********');
            expect(ttsReadableText).not.toContain('___________');
            expect(ttsReadableText).not.toContain('~~~~~~~~~~~');
        });

        it('should handle Qiita article with mixed separators and content', () => {
            // 複数のセパレータタイプを含む実況的な記事構造
            const html = `
                <h1>タイトル：TypeScript学習ガイド</h1>
                <p>==========================</p>
                <p>このガイドでは、TypeScriptの基本から応用までを学びます。</p>
                
                <h2>セクション1: はじめに</h2>
                <p>-----------</p>
                <p>TypeScriptはJavaScriptの上位互換です。</p>
                <p>静的型チェック = 開発効率の向上</p>
                
                <h2>セクション2: インストール</h2>
                <p>***********</p>
                <p>npm install -g typescript</p>
                <p>これでインストール完了です。</p>
                
                <h2>セクション3: まとめ</h2>
                <p>~~~~~~~~~~~~~~~~~~~</p>
                <p>以上、TypeScriptの基本を学びました。</p>
            `;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // セパレータのない段落のみを集める
            const ttsContent = paragraphs
                .filter(p => p.cleanedText.trim() !== '')
                .map(p => p.cleanedText)
                .join('\n');

            // 実際の内容は含まれていることを確認
            expect(ttsContent).toContain('タイトル：TypeScript学習ガイド');
            expect(ttsContent).toContain('このガイドでは、TypeScriptの基本から応用までを学びます。');
            expect(ttsContent).toContain('セクション1: はじめに');
            expect(ttsContent).toContain('TypeScriptはJavaScriptの上位互換です。');
            expect(ttsContent).toContain('静的型チェック = 開発効率の向上'); // 混在コンテンツなので残る
            expect(ttsContent).toContain('セクション3: まとめ');
            expect(ttsContent).toContain('以上、TypeScriptの基本を学びました。');

            // セパレータのみの段落のテキストは空であることを確認
            const separatorParagraphs = paragraphs.filter(p => {
                const trimmed = p.cleanedText.trim();
                return /^[=*\-_#~]+$/.test(trimmed);
            });
            expect(separatorParagraphs.length).toBe(0); // 完全なセパレータはない（空文字列）
        });

        it('should not affect content with single or double repeated symbols', () => {
            // 記号の繰り返しが2つ以下のコンテンツは保持
            const html = `
                <p>ポイント = 重要度</p>
                <p>====================</p>
                <p>リスト内容</p>
                <p>- アイテム1</p>
                <p>- アイテム2</p>
                <p>お疲れ様です~~</p>
            `;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // セパレータのみのもの（多数の繰り返し）は空になる
            const emptyParagraphs = paragraphs.filter(p => p.cleanedText.trim() === '');
            expect(emptyParagraphs.length).toBeGreaterThan(0);

            // 記号を含むがセパレータでないテキストは保持される
            const contentWithSymbols = paragraphs.find(p => p.cleanedText.includes('ポイント = 重要度'));
            expect(contentWithSymbols).toBeDefined();
            expect(contentWithSymbols?.cleanedText).toContain('ポイント = 重要度');

            // リスト記号を含むコンテンツも保持される
            const listItems = paragraphs.filter(p => p.cleanedText.includes('アイテム'));
            expect(listItems.length).toBeGreaterThan(0);

            // チルダを含むコンテンツも保持される（セパレータではないため）
            const tildeContent = paragraphs.find(p => p.cleanedText.includes('お疲れ様です'));
            expect(tildeContent).toBeDefined();
        });

        it('should correctly handle TTS request building with actual text filtering', () => {
            // 実際のTTSリクエスト構築をシミュレート
            const html = `
                <article>
                    <h2>記事タイトル</h2>
                    <p>==============</p>
                    <p>最初の段落です。</p>
                    <p>-----------</p>
                    <p>2番目の段落です。</p>
                    <p>サブタイトル~~~</p>
                    <p>***********</p>
                    <p>最後の段落です。</p>
                </article>
            `;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // TTSに送信される実際のテキスト（フィルタリング後）
            const ttsRequestTexts = paragraphs
                .filter(p => p.cleanedText.trim() !== '')
                .map(p => p.cleanedText);

            // セパレータが除外されていることを確認
            expect(ttsRequestTexts).not.toContain('==============');
            expect(ttsRequestTexts).not.toContain('-----------');
            expect(ttsRequestTexts).not.toContain('***********');

            // 実際のコンテンツが含まれていることを確認
            const joinedText = ttsRequestTexts.join(' ');
            expect(joinedText).toContain('記事タイトル');
            expect(joinedText).toContain('最初の段落です。');
            expect(joinedText).toContain('2番目の段落です。');
            expect(joinedText).toContain('最後の段落です。');

            // 全段落数（article要素の他のセパレータを含む）
            expect(paragraphs.length).toBe(8);

            // 実際にTTSに送信されるのはセパレータ以外の段落のみ
            expect(ttsRequestTexts.length).toBeLessThan(paragraphs.length);
        });
    });

    describe('chunk resizing', () => {
        it('should split text exceeding 5000 bytes at punctuation', () => {
            // 日本語の「あ」は3バイト、1667文字で約5000バイト
            // 安全上限は4800バイトなので、1600文字を超える場合はリサイズされる
            const longJapaneseText = 'あ'.repeat(1700); // 約5100バイト
            const longTextWithPunctuation = `${longJapaneseText.slice(0, 800)}。${longJapaneseText.slice(801)}`;

            const html = `<p>${longTextWithPunctuation}</p>`;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // リサイズされて複数のチャンクに分割されるはず
            expect(paragraphs.length).toBeGreaterThan(1);

            // 各チャンクが安全サイズ内であることを確認
            for (const chunk of paragraphs) {
                const byteSize = Buffer.byteLength(chunk.cleanedText, 'utf-8');
                expect(byteSize).toBeLessThanOrEqual(4800);
            }
        });

        it('should split text by commas when no period is available', () => {
            // 句点なしで読点ありのテキスト
            const longText = 'あ'.repeat(500) + '、' + 'い'.repeat(500) + '、' + 'う'.repeat(500) + '、' + 'え'.repeat(500);

            const html = `<p>${longText}</p>`;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // 複数のチャンクに分割されるはず
            expect(paragraphs.length).toBeGreaterThan(1);
        });

        it('should force split text without any delimiters', () => {
            // 区切り文字なしの長いテキスト（日本語のみ）
            const longTextNoDelimiter = 'あ'.repeat(2000); // 約6000バイト

            const html = `<p>${longTextNoDelimiter}</p>`;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // フォーススプリットで分割されるはず
            expect(paragraphs.length).toBeGreaterThan(1);

            // 各チャンクが安全サイズ内であることを確認
            for (const chunk of paragraphs) {
                const byteSize = Buffer.byteLength(chunk.cleanedText, 'utf-8');
                expect(byteSize).toBeLessThanOrEqual(4800);
            }
        });

        it('should not split text under 4800 bytes', () => {
            // 短いテキスト（安全上限以下）
            const shortText = 'こんにちは世界';

            const html = `<p>${shortText}</p>`;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // 1つのチャンクのまま
            expect(paragraphs.length).toBe(1);
            expect(paragraphs[0].cleanedText).toBe(shortText);
        });

        it('should handle mixed Japanese and English text', () => {
            // 日英混合の長いテキスト
            const mixedText = ('日本語テキスト. English text. ' + 'あ'.repeat(200)).repeat(10);

            const html = `<p>${mixedText}</p>`;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // 各チャンクが安全サイズ内であることを確認
            for (const chunk of paragraphs) {
                const byteSize = Buffer.byteLength(chunk.cleanedText, 'utf-8');
                expect(byteSize).toBeLessThanOrEqual(4800);
            }
        });

        it('should preserve delimiter priority (。 > 、 > .)', () => {
            // 句点、読点、ピリオドを含むテキスト
            // 約5000バイト超えになるようにして、句点で分割されることを確認
            const text = 'あ'.repeat(800) + '。' + 'い'.repeat(800) + '、' + 'う'.repeat(800);

            const html = `<p>${text}</p>`;
            const { paragraphs } = parseHTMLToParagraphs(html);

            // 分割されているはず
            expect(paragraphs.length).toBeGreaterThan(1);

            // 最初のチャンクは句点で終わるはず（優先度が高いため）
            if (paragraphs.length >= 2) {
                expect(paragraphs[0].cleanedText.endsWith('。')).toBe(true);
            }
        });
    });

    describe('Frontend Filtering - TTS API Request Validation', () => {
        it('should filter out empty cleanedText from TTS prefetch queue', () => {
            // Qiita形式の記事：複数のセパレータを含む
            const html = `
                <p>はじめに</p>
                <p>====</p>
                <p>本文の最初</p>
                <p>----</p>
                <p>詳細情報</p>
                <p>====</p>
                <p>まとめ</p>
            `.trim();

            const { paragraphs } = parseHTMLToParagraphs(html);

            // セパレータを含む全テキスト
            expect(paragraphs.length).toBe(7);

            // cleanedTextをフィルタリング（フロントエンドでやるべき処理）
            const textsToSend = paragraphs
                .map(p => p.cleanedText)
                .filter(text => text.trim() !== '');

            // TTSに送信されるべきテキストのみが残る
            expect(textsToSend.length).toBe(4); // はじめに、本文の最初、詳細情報、まとめ
            expect(textsToSend).toEqual(['はじめに', '本文の最初', '詳細情報', 'まとめ']);

            // TTSに送信されるテキストにセパレータが含まれていないこと
            textsToSend.forEach(text => {
                expect(text).not.toMatch(/^[=*\-_#~]+$/);
            });
        });

        it('should handle consecutive separators correctly', () => {
            const html = `
                <p>Part1</p>
                <p>===</p>
                <p>===</p>
                <p>Part2</p>
                <p>---</p>
                <p>---</p>
                <p>---</p>
                <p>Part3</p>
            `.trim();

            const { paragraphs } = parseHTMLToParagraphs(html);

            // フロントエンドでのフィルタリング
            const textsToSend = paragraphs
                .map(p => p.cleanedText)
                .filter(text => text.trim() !== '');

            // セパレータは全て除外
            expect(textsToSend).toEqual(['Part1', 'Part2', 'Part3']);
        });

        it('should preserve mixed content with symbols', () => {
            const html = `
                <p>This has === in the middle</p>
                <p>====</p>
                <p>This has ---- multiple dashes</p>
            `.trim();

            const { paragraphs } = parseHTMLToParagraphs(html);

            // フロントエンドでのフィルタリング
            const textsToSend = paragraphs
                .map(p => p.cleanedText)
                .filter(text => text.trim() !== '');

            // セパレータのみが除外される
            expect(textsToSend.length).toBe(2);
            expect(textsToSend).toEqual([
                'This has === in the middle',
                'This has ---- multiple dashes'
            ]);
        });
    });
});
