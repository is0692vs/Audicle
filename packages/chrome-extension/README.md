# Audicle

Audicle（Article + Audio）は、ウェブページ上の記事コンテンツを音声で読み上げる Chrome 拡張機能です。

クリックした段落から、記事- **音声合成方式**: `config.json` の `synthesizerType` で音声合成エンジンを指定できます。設定変更後は拡張機能のリロードが必要です。

> **📋 詳細ガイド**: 利用可能な音声合成モジュールの詳細は `AUDIO_SYNTHESIS_MODULES.md` を参照してください。最後までをインテリジェントに読み上げ、再生箇所をハイライトすることで、快適な「ながら読書」体験を提供します。

## ✨ 主な機能

![デモ画像](docs/simpledemo.png)

- **ワンクリック再生**: 記事の読みたい段落をクリックするだけで、そこから再生が開始されます。
- **インテリジェントな本文抽出**: [Mozilla Readability.js](https://github.com/mozilla/readability) を活用し、広告やサイドバーなどの不要な要素を除去。本文だけを賢く抽出します。
- **構造を意識した読み上げ**: 見出しや箇条書きを認識し、「見出し。」「箇条書きです。」といった前置きを付加することで、音声だけでも文章の構造を理解しやすくします。また，特定のドメインに対して固有のルール（現在は qiita.com の記事ページに特化したルールが実装済み）を追加することで，より自然な読み上げを実現することが可能になります。
- **連続再生 & プリフェッチ**: 記事の最後まで音声を自動で連続再生。次に再生する音声データを先読み（プリフェッチ）することで、チャンク間の途切れを最小限に抑えます。
- **同期ハイライト**: 現在再生中の段落がリアルタイムでハイライトされ、どこを読んでいるかが一目でわかります。
- **再生コントロール**: ポップアップから、読み上げモードの ON/OFF や、再生の一時停止/再開が可能です。

## 📖 使い方

1. **インストール**: `chrome://extensions` ページで「パッケージ化されていない拡張機能を読み込む」を選択し、**`packages/chrome-extension`ディレクトリ** を読み込みます。
2. **有効化**: 読み上げたい記事ページを開き、ブラウザのツールバーにある Audicle アイコンをクリック。ポップアップ内の「読み上げモード」トグルスイッチを ON にします。
3. **再生**: ページ上のハイライト可能になった段落をクリックすると、その位置から 2.0 倍速での読み上げが開始されます。
4. **操作**:
   - **再生位置の変更**: 別の段落をクリックすると、再生が即座にその位置へ移動します。
   - **一時停止/再開**: ポップアップの「一時停止」ボタンで再生を止め、「再開」ボタンで続きから再生できます。
   - **完全停止**: 「読み上げモード」のトグルスイッチを OFF にすると、再生が完全に停止し、ハイライトも解除されます。

## 🛠️ アーキテクチャ概要

本拡張機能は、責務を明確に分離したコンポーネントで構成されています。

- **`popup.html` / `popup.js` / `popup.css`**: ユーザーが操作する UI を提供。拡張機能の ON/OFF、一時停止/再開の**意思**を`chrome.storage`やメッセージを通じて`content.js`に伝えます。
- **`content.js`**: ページ上で動作するメインスクリプト。
  - `Readability.js`を使い、本文の構造化されたテキストを抽出。
  - 再生キューの管理、連続再生、同期ハイライトの全ロジックを担当。
  - `background.js`にテキストを渡し、音声データの取得を依頼します。
- **`background.js`**: バックグラウンドで動作するサービスワーカー。
  - **疎結合音声合成モジュール**: `AudioSynthesizer`基底クラス・`GoogleTTSSynthesizer`実装・`SynthesizerFactory`ファクトリによる疎結合設計を採用。
  - `config.json`で指定された音声合成方式（現在は Google TTS）に基づいて、テキストから音声データ URL を生成。
  - 将来的な音声合成エンジンの追加・変更を容易にするアーキテクチャを実現。
- **`config.json`**: 使用する音声合成方式を指定する設定ファイル（現在は`{"synthesizerType": "google_tts"}`）。
- **`lib/Readability.js`**: Mozilla 製の本文抽出ライブラリ。ノイズを除去し、質の高いテキストコンテンツを提供します。

### 音声合成モジュール設計

音声合成ロジックは疎結合モジュールとして分離されており、以下の構造で動作します：

```javascript
// 統一インターフェース
class AudioSynthesizer {
  async synthesize(text) // テキスト → 音声データURL
}

// Google TTS実装
class GoogleTTSSynthesizer extends AudioSynthesizer {
  // Google翻訳TTSエンドポイントを利用
}

// ファクトリによる方式選択
SynthesizerFactory.create(config.synthesizerType)
```

この設計により、将来的に Azure Cognitive Services、Amazon Polly、Web Speech API などの新しい音声合成エンジンを容易に追加できます。

## 📂 プロジェクト構造 (モノレポ)

本プロジェクトは、複数のパッケージを単一リポジトリで管理するモノレポ構成を採用しています。

```bash
/ (リポジトリルート)
└── packages/
    ├── chrome-extension/   # Chrome拡張機能のソースコード
    ├── python-tts-server/  # Python製TTSサーバー
    ├── docker-tts-server/  # Docker版TTSサーバー
    └── api-server/         # (将来利用予定の) 新APIサーバー
        └── .gitkeep          # (空の状態)
```

## ⚙️ 設定

- **読み上げモード**: ポップアップのトグルスイッチで ON/OFF を切り替えます。OFF にすると、再生が完全に停止し、ハイライトも解除されます。
- **一時停止/再開**: ポップアップの「一時停止」ボタンで再生を止め、「再開」ボタンで続きから再生できます。
- **再生速度**: 現在は固定で 2.0 倍速に設定しています。等倍速がかなり遅いため、2.0 倍速にしています。
- **音声合成方式**: `config.json` の `synthesizerType` で音声合成エンジンを指定できます。設定変更後は拡張機能のリロードが必要です。
  - **利用可能なエンジン**: `google_tts`（デフォルト）, `test`, `edge_tts`, `edge_tts_docker`, `api_server`（新しい API サーバー）

## 🧪 テスト方法

### 基本動作テスト

1. **Chrome 拡張機能の更新**

   `chrome://extensions/` で Audicle 拡張機能の「更新」ボタンをクリック

2. **テストページでの確認**

   - リポジトリ内の `packages/chrome-extension/test/test.html` をブラウザで開いて基本機能をテスト
   - 段落をクリックして音声再生・ハイライト機能を確認

3. **Qiita ページでの確認**

   - リポジトリ内の `packages/chrome-extension/test/qiitasample.html` をブラウザで開く
   - Console で以下のログを確認:

     ```text
     [ExtractionRules] Found site-specific rule: qiita-custom
     [NewRulesManager] Using rule: qiita-custom (site-specific, priority: 1000)
     [🎯 Extraction Result] Rule: qiita-custom, Blocks: XX, Domain: qiita.com
     ```

4. **新ルール管理システムの動作確認**
   - Console で新ルール管理システムのログを確認
   - 現在のページで採用されるルール情報を確認

### API Server テスト

新しい API サーバーを使用する場合の追加テスト手順：

1. **API サーバー起動**

   リポジトリのルートディレクトリで以下のコマンドを実行します。

   ```bash
   cd packages/api-server
   docker-compose up -d
   ```

2. **設定変更**

   `config.json` を手動編集：

   ```json
   {
     "synthesizerType": "api_server"
   }
   ```

3. **動作確認**

   ```bash
   curl http://localhost:8000/
   ```

4. **音声合成テスト**

   ```bash
   curl -X POST http://localhost:8000/synthesize \
     -H "Content-Type: application/json" \
     -d '{"text": "こんにちは", "voice": "ja-JP-Neural2-B"}' \
     --output test.mp3
   ```

### Edge TTS Docker テスト

Docker 版 Edge TTS を使用する場合の追加テスト手順：

1. **Docker サーバー起動**

   リポジトリのルートディレクトリで以下のコマンドを実行します。

   ```bash
   cd packages/docker-tts-server
   docker-compose up -d
   ```

2. **設定変更**

   `config.json` を手動編集：

   ```json
   {
     "synthesizerType": "edge_tts_docker"
   }
   ```

   Google Cloud TTS Docker を使用する場合:

   ```json
   {
     "synthesizerType": "google_cloud_tts_docker"
   }
   ```

3. **動作確認**

   ```bash
   curl http://localhost:8001/
   ```

4. **LAN アクセステスト** (他 PC から利用する場合)
   - Docker の .env ファイルでポート設定を調整
   - SSH ポートフォワーディング等でアクセス経路を設定
   - 他 PC から音声再生をテスト

## 🔧 開発者向け - 新サイト対応ルール追加手順

特定のサイトに最適化された抽出ルールを追加する場合の手順：

> **📋 詳細ガイド**: より詳しい情報は `content-extract/RULE_ADDITION_GUIDE.md` を参照してください。

### 1. ルール定義ファイルの編集

`content-extract/rules.js` の `SITE_SPECIFIC_RULES` に新しいルールを追加：

```javascript
const SITE_SPECIFIC_RULES = {
  // 既存のルール...

  "example.com": {
    id: "example-custom",
    priority: 1000,
    type: "site-specific",
    contentSelector: "article p, .content p, main p", // サイト固有のセレクター
    description: "example.com用カスタム抽出ルール",
  },
};
```

### 2. セレクターの特定方法

1. **対象サイトを Chrome で開く**
2. **Developer Tools (F12) で要素を検査**
3. **本文部分の CSS セレクターを特定**
4. **Console で動作確認**:

   ```javascript
   // セレクターのテスト
   document.querySelectorAll("your-selector-here");
   ```

### 3. 優先度の設定

- `priority: 1000` - サイト固有ルール（最優先）
- `priority: 500` - 汎用ルール
- `priority: 100` - フォールバックルール

### 4. ルールの動作確認

1. **拡張機能のリロード**: `chrome://extensions/` で Audicle 拡張機能を更新
2. **対象サイトでテスト**: ページを開いて Console を確認
3. **ルール採用状況の確認**: Console に自動表示される `[📋 Current Page Rule]` ログを確認

### 5. よく使用される CSS セレクターのパターン

- **記事サイト**: `article p, .post-content p, .entry-content p`
- **ブログ**: `main p, .content p, .post-body p`
- **ニュースサイト**: `.article-body p, .story-content p`
- **技術サイト**: `.markdown-body p, .article-content p`

### 6. デバッグのヒント

- **Console ログ確認**: `[🎯 Extraction Result]` でどのルールが採用されたかを確認
- **抽出結果の検証**: `getCurrentPageRuleInfo()` を Console で実行
- **複数ルール競合時**: `priority` の値で採用優先度が決定される

## 📝 注意事項

- **対応言語**: 現在、Google 翻訳の TTS は日本語と英語に最適化されています。他の言語では発音が不自然になる場合があります。
- **利用制限**: Google 翻訳の TTS サービスは非公式の利用方法であり、将来的に利用できなくなる可能性があります。また、大量のリクエストを送信すると、一時的にブロックされる場合があります。
- **プライバシー**: 本拡張機能は、読み上げるテキストを Google のサーバーに送信します。機密情報の読み上げには注意してください。
- **ブラウザ互換性**: 本拡張機能は Google Chrome 向けに開発されています。他の Chromium ベースのブラウザ（例: Microsoft Edge）でも動作する可能性がありますが、動作保証はありません。
- **パフォーマンス**: 長い記事や複雑なページでは、本文抽出や音声データの取得に時間がかかる場合があります。快適な利用のため、安定したインターネット接続を推奨します。
