export const mockArticles = [
    {
        url: 'https://github.com/is0692vs',  // 自分のGitHubプロフィール
        title: 'is0692vs - Overview',
    },
    {
        url: 'https://qiita.com/Opabinium/items/190eff0194cd6cef4b78',  // Qiitaの自分の記事
        title: 'Jules APIが公開されたのでVSCode拡張機能を作ってみた',
    }
];

// Minimal valid silent MP3 file (1 frame, ~0.026 seconds)
// This is a valid MPEG Audio Layer 3 frame that decodes to silence
export const validAudioBase64 = '//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';

// Legacy mock data (deprecated)
export const mockAudioData = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAA...';

// Mock article content for E2E tests
export const mockArticleContent = {
    title: 'テスト記事タイトル',
    content: 'これはテスト用の記事コンテンツです。音声再生のテストに使用されます。',
    paragraphs: [
        'これはテスト用の記事コンテンツです。',
        '音声再生のテストに使用されます。'
    ]
};