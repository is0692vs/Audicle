# Audicle の DRY (Don't Repeat Yourself) ガイド

このガイドは、Audicle プロジェクトで残っているコードの重複とハードコードされた値を文書化し、より良い保守性のためにリファクタリングすべきものを示します。

## 残っているハードコードされた値

### 1. TTS 合成パターン

**場所**: `packages/chrome-extension/background.js` - すべてのシンセサイザークラス
**問題**: すべてのシンセサイザー実装で似たような fetch/blob 処理ロジックが繰り返されている
**推奨**: 共通の合成ロジックを基底クラスのメソッドやユーティリティ関数に抽出する

```javascript
// 現在のパターン（すべてのシンセサイザーで繰り返し）
const response = await fetch(`${this.serverUrl}/synthesize/simple`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: cleanedText }),
});

if (!response.ok) {
  throw new Error(`Server error: ${response.status} ${response.statusText}`);
}

const blob = await response.blob();
return new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (e) => resolve(e.target.result);
  reader.readAsDataURL(blob);
});
```

### 2. API エラーハンドリング

**場所**: `packages/chrome-extension/background.js` - すべてのシンセサイザークラス
**問題**: fetch 失敗に対する似たようなエラーハンドリングパターン
**推奨**: 中央集権的なエラーハンドリングユーティリティを作成する

### 3. レート制限ロジック

**場所**: `packages/chrome-extension/content.js` および他のファイルの可能性
**問題**: 似たようなパターンが他にある場合、レート制限の実装が重複する可能性
**推奨**: 共有ユーティリティモジュールに抽出する

### 4. 設定読み込み

**場所**: `packages/chrome-extension/content.js` および `packages/chrome-extension/background.js`
**問題**: フォールバックロジック付きの似たような `loadConfig()` 関数
**推奨**: 共有の設定モジュールを作成する

### 5. オーディオ再生設定

**場所**: `packages/chrome-extension/content.js` - `playQueue()` およびメッセージリスナー
**問題**: 似たようなオーディオ設定コード（playbackRate、イベントリスナー）
**推奨**: オーディオ設定をユーティリティ関数に抽出する

### 6. キュー構築関数

**場所**: `packages/chrome-extension/content.js` - 複数の `buildQueueWith*` 関数
**問題**: 関数間で似たようなチャンキングロジック（`chunkSize` の使用）が繰り返されている
**推奨**: チャンキングロジックを共有ユーティリティに抽出する

### 7. 要素準備

**場所**: `packages/chrome-extension/content.js` - `prepareClickableElement()` 呼び出し
**問題**: 似たような要素スタイリングと ID 割り当てロジック
**推奨**: すべての抽出メソッドで一貫した要素準備を確保する

## 外部化可能な定数

### 1. マジックナンバー

- `handleClick()` の `JUMP_BATCH_SIZE = 3` - 設定可能にできる
- `progressiveFetch()` の `INITIAL_BATCH_SIZE = 5` - 既に config にあり
- リトライ遅延（3000ms）- 設定可能にできる

### 2. セレクタ文字列

- `content.js` のカスタムルールセレクタ - 既に抽象化されているが、より設定可能にできる
- フォールバックセレクタ - config に移動できる

### 3. デフォルト値

- フォールバックでのデフォルト playbackRate = 1.0
- フォールバックでのデフォルト chunkSize = 200

## 推奨リファクタリング手順

1. **共有ユーティリティモジュールの作成**

   - 共通の合成パターンを抽出
   - 中央集権的なエラーハンドリングを作成
   - 設定管理ユーティリティを追加

2. **設定読み込みの統合**

   - 設定読み込みの単一の信頼できるソース
   - 一貫したフォールバック処理

3. **オーディオ管理の抽出**

   - 統合されたオーディオ設定と再生ロジック
   - コンポーネント間での一貫したレート制限

4. **キュー構築の標準化**

   - 共通のチャンキングユーティリティ
   - 統合された要素準備

5. **残りの定数の外部化**
   - マジックナンバーを config.json に移動
   - 適切な場所でセレクタを設定可能にする

## DRY リファクタリングの利点

- **保守性**: 共通ロジックの変更が 1 箇所で済む
- **一貫性**: すべてのシンセサイザーとコンポーネントで統一された動作を確保
- **テスト容易性**: 共有ユーティリティのユニットテストが容易
- **設定可能性**: コード変更なしでより多くの設定をユーザーが設定可能にする

## 実装優先度

1. 高: TTS 合成パターンの抽出（即時のコード重複）
2. 中: 設定読み込みの統合
3. 低: 残りのマジックナンバーの外部化
4. 将来: オーディオ管理のための共有ユーティリティの作成
