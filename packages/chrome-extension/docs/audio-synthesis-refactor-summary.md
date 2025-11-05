# 音声合成モジュール疎結合化 - 実装サマリー

## 概要

音声合成ロジックを疎結合なモジュールとして分離し、将来的な拡張性と保守性を向上させました。現在の Google TTS による音声再生機能を完全に維持しながら、新しい音声合成エンジンを容易に追加できる設計に変更されています。

## 実装内容

### 1. アーキテクチャ変更

#### 変更前

```javascript
// background.js内で直接Google TTS処理
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.command === "play") {
    // Google TTS処理が直接記述
    const response = await fetch(
      `https://translate.google.com/translate_tts?...`
    );
    // ...
  }
});
```

#### 変更後

```javascript
// 疎結合モジュール設計
class AudioSynthesizer {
  /* 基底クラス */
}
class GoogleTTSSynthesizer extends AudioSynthesizer {
  /* 実装 */
}
class SynthesizerFactory {
  /* ファクトリ */
}

// 設定ベース初期化
const config = await loadConfig();
const synthesizer = await SynthesizerFactory.create(config.synthesizerType);
```

### 2. 新規ファイル・設定

#### `packages/chrome-extension/audicle/config.json`

```json
{
  "synthesizerType": "google_tts"
}
```

#### `packages/chrome-extension/audicle/manifest.json` 更新

```json
{
  "web_accessible_resources": [
    {
      "resources": ["styles.css", "lib/Readability.js", "config.json"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### 3. クラス構造

```javascript
// 統一インターフェース
class AudioSynthesizer {
  async synthesize(text) {
    throw new Error("Must be implemented by subclass");
  }
}

// Google TTS実装
class GoogleTTSSynthesizer extends AudioSynthesizer {
  async synthesize(text) {
    const ttsUrl = this.buildTTSUrl(text);
    const response = await fetch(ttsUrl);
    const arrayBuffer = await response.arrayBuffer();
    return this.arrayBufferToDataUrl(arrayBuffer);
  }
}

// ファクトリパターン
class SynthesizerFactory {
  static async create(type) {
    switch (type) {
      case "google_tts":
        return new GoogleTTSSynthesizer();
      default:
        throw new Error(`Unknown synthesizer type: ${type}`);
    }
  }
}
```

## データフロー

### 1. 初期化フロー

```text
拡張機能起動
  ↓
config.json読込 (chrome.runtime.getURL + fetch)
  ↓
SynthesizerFactory.create(config.synthesizerType)
  ↓
synthesizer インスタンス生成完了
```

### 2. 音声再生フロー

```text
content.js: 音声再生リクエスト
  ↓
background.js: メッセージ受信 { command: 'play', text, ... }
  ↓
synthesizer.synthesize(text)
  ↓
Google TTS API呼び出し
  ↓
MP3データ → data:audio/mp3;base64,... 変換
  ↓
content.js: { command: 'audio', url: '...' } 受信
  ↓
audio要素で再生・エラーハンドリング
```

### 3. 設定変更フロー

```text
config.json編集
  ↓
拡張機能リロード（chrome://extensions/）
  ↓
新しい設定で初期化
  ↓
新しい音声合成方式で動作
```

## 拡張性

### 新しい音声合成エンジン追加手順

1. **新実装クラス作成**

```javascript
class AzureTTSSynthesizer extends AudioSynthesizer {
  async synthesize(text) {
    // Azure Cognitive Services TTS実装
  }
}
```

2. **ファクトリに追加**

```javascript
class SynthesizerFactory {
  static async create(type) {
    switch (type) {
      case "google_tts":
        return new GoogleTTSSynthesizer();
      case "azure_tts":
        return new AzureTTSSynthesizer();
      default:
        throw new Error(`Unknown synthesizer type: ${type}`);
    }
  }
}
```

3. **設定変更**

```json
{
  "synthesizerType": "azure_tts"
}
```

4. **拡張機能リロード**

## エラーハンドリング強化

### content.js での音声再生エラー対応

```javascript
// audioError イベントハンドラ追加
audioPlayer.addEventListener("error", (event) => {
  console.error("Audio playback error:", event.error);
  if (retryCount < MAX_RETRIES) {
    // リトライ処理
    retryCount++;
    setTimeout(() => playCurrentChunk(), RETRY_DELAY);
  } else {
    // スキップ処理
    console.warn("Max retries reached, skipping to next chunk");
    playQueue();
  }
});
```

## テスト方法

### 1. 基本動作確認

1. `chrome://extensions/` で拡張機能をリロード
2. Qiita 記事等を開く
3. 拡張機能 ON にして段落をクリック
4. Google TTS による音声再生を確認

### 2. 設定変更確認

1. `packages/chrome-extension/audicle/config.json` の `synthesizerType` を確認
2. 不正な値（例：`"invalid_tts"`）に変更
3. 拡張機能リロード → コンソールエラー確認
4. 正しい値（`"google_tts"`）に戻して正常動作確認

### 3. エラーハンドリング確認

- ネットワーク切断状態で音声再生 → リトライ・スキップ動作確認
- 長時間再生での Google TTS 制限 → 適切なエラー処理確認

## 互換性

- **既存機能**: すべての既存機能（クリック再生、連続再生、ハイライト、一時停止等）が完全に維持
- **設定**: 従来の`chrome.storage`による設定は変更なし
- **UI**: popup.html の外観・動作に変更なし
- **データ**: 既存のキャッシュやキュー管理ロジックに変更なし

## 今後の展望

1. **追加可能な音声合成エンジン**

   - Azure Cognitive Services Speech
   - Amazon Polly
   - Web Speech API（再考の場合）
   - OpenAI TTS API

2. **設定 UI 強化**

   - popup.html での方式選択（将来的）
   - 音声速度・音質設定

3. **パフォーマンス最適化**
   - エンジン固有のバッチ処理最適化
   - キャッシュ戦略の改善

## まとめ

音声合成ロジックの疎結合化により、以下を実現しました：

- ✅ **保守性向上**: 音声合成ロジックが独立し、変更影響を局所化
- ✅ **拡張性確保**: 新しい音声合成エンジンの追加が容易
- ✅ **設定の柔軟性**: `config.json`による方式指定
- ✅ **既存機能維持**: すべての既存機能が正常動作
- ✅ **エラー処理強化**: 音声再生失敗時のリトライ・スキップ機能

この設計により、将来的な要求変更や技術進化に柔軟に対応できる基盤が整いました。
