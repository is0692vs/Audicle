# 音声合成モジュール一覧

Audicle で使用可能な音声合成エンジンとその設定方法

## 🎯 概要

Audicle は疎結合な音声合成モジュール設計を採用しており、複数の音声合成エンジンを切り替えて使用できます。  
`config.json` の `synthesizerType` で使用するエンジンを指定します。

## 📋 利用可能なモジュール

### 1. Google TTS (デフォルト)

**設定値**: `"google_tts"`

```json
{
  "synthesizerType": "google_tts"
}
```

**特徴**:

- ✅ **高品質**: Google 翻訳の音声合成エンジンを使用
- ✅ **日本語対応**: 自然な日本語読み上げ
- ✅ **英語対応**: 英語テキストも適切に読み上げ
- ✅ **無料**: 追加コストなし
- ⚠️ **ネット必須**: インターネット接続が必要
- ⚠️ **非公式**: Google 翻訳の非公式利用

**適用場面**:

- 一般的な記事の読み上げ
- 日本語・英語混在コンテンツ
- 高品質な音声が必要な場合

**技術詳細**:

- エンドポイント: `https://translate.google.com/translate_tts`
- 音声形式: MP3
- 言語: 日本語 (tl=ja)

---

### 2. API Server (新しい標準バックエンド)

**設定値**: `"api_server"`

```json
{
  "synthesizerType": "api_server"
}
```

**特徴**:

- ✅ **高品質**: Google Cloud Text-to-Speech API (WaveNet / Neural2) を使用
- ✅ **安定性**: 公式 API による安定した動作
- ✅ **カスタマイズ可能**: 音声の種類や速度の調整が可能
- ✅ **セキュア**: サーバーサイドで API キーを管理
- ⚠️ **サーバー必須**: `packages/api-server` の起動が必要

**適用場面**:

- 安定した本番環境での長期運用
- 最高品質の音声が必要な場合
- 読み上げパラメータを細かく制御したい場合

**技術詳細**:

- サーバー: `packages/api-server` (http://localhost:8000)
- 音声形式: MP3
- デフォルト音声: ja-JP-Neural2-B (Google Cloud TTS)

**セットアップ手順**:

1. **API Server 起動**:

   ```bash
   cd packages/api-server
   docker-compose up -d
   ```

2. **設定変更**:

   ```json
   {
     "synthesizerType": "api_server"
   }
   ```

3. **拡張機能リロード**: Chrome 拡張機能を更新

---

### 3. Test Synthesizer (開発用)

**設定値**: `"test"`

```json
{
  "synthesizerType": "test"
}
```

**特徴**:

- 🔧 **開発専用**: テスト・デバッグ用途
- ✅ **オフライン**: ネット接続不要
- ✅ **高速**: 即座に応答
- ⚠️ **固定音声**: 常に同じサンプル音声を再生
- ❌ **テキスト無視**: 実際のテキスト内容を読まない

**適用場面**:

- 拡張機能の動作テスト
- オフライン環境での開発
- 音声再生機能のデバッグ

**技術詳細**:

- 音声ファイル: `sample.mp3` を使用
- 音声形式: MP3
- レスポンス: 固定

## 🔧 設定方法

### 1. 設定ファイルの編集

`packages/chrome-extension/config.json` を編集：

```json
{
  "synthesizerType": "google_tts" // または "api_server", "test"
}
```

### 2. 拡張機能のリロード

1. `chrome://extensions/` を開く
2. Audicle 拡張機能の「更新」ボタンをクリック
3. 設定が反映されます

### 3. 動作確認

- 任意のページで読み上げ機能を実行
- Console で以下のログを確認:
  ```
  [GoogleTTSSynthesizer] Synthesizing: "テキスト内容"
  ```
  または
  ```
  [APIServerSynthesizer] Synthesizing: "テキスト内容"
  ```

## 🚀 新しいモジュールの追加

### アーキテクチャ概要

```javascript
// 1. 基底クラス
class AudioSynthesizer {
  async synthesize(text) {
    // 実装が必要
  }
}

// 2. 具象クラス
class NewSynthesizer extends AudioSynthesizer {
  async synthesize(text) {
    // 独自の音声合成ロジック
  }
}

// 3. ファクトリ登録
class SynthesizerFactory {
  static create(type) {
    switch (type) {
      case "new_engine":
        return new NewSynthesizer();
      // ...
    }
  }
}
```

### 実装手順

1. **新クラス作成**: `background.js` に新しい Synthesizer クラスを追加
2. **ファクトリ登録**: `SynthesizerFactory.create()` に新しいケースを追加
3. **設定値追加**: `config.json` で新しい `synthesizerType` を指定可能に
4. **テスト実行**: 動作確認とデバッグ

## 🚨 注意事項

### Google TTS (非公式) 使用時

- **利用制限**: 大量リクエストでブロックされる可能性
- **プライバシー**: テキストが Google サーバーに送信される
- **安定性**: 非公式 API のため将来利用不可の可能性

### API Server 使用時

- **Docker 必須**: Docker と Docker Compose の環境が必要
- **GCP クレデンシャル**: Google Cloud のサービスアカウントキーが必要

### Test Synthesizer 使用時

- **本番非推奨**: 開発・テスト専用
- **音声品質**: 実際の読み上げ品質は確認不可

### 設定変更時

- **拡張機能リロード必須**: 設定変更後は必ずリロード
- **キャッシュクリア**: 古い音声データがキャッシュされる場合あり
