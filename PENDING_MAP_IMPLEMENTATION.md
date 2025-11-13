# Pending Map 実装ドキュメント

## 概要

先読み処理における重複 HTTP リクエスト対策として、フロントエンド側に **Pending Map** を導入しました。

同じテキスト＋音声パラメータのリクエストが複数回発行される場合、最初のリクエストの Promise を再利用することで、重複する HTTP リクエストと Vercel Function 実行を完全に排除します。

## 実装内容

### 1. Pending Map の管理構造

**ファイル**: `packages/web-app-vercel/lib/api.ts`

```typescript
// グローバルスコープで Pending Map を管理
const pendingRequests = new Map<string, Promise<Blob>>();
```

### 2. キー生成関数

#### `generateHashKey(text: string): string`

- テキストをシンプルなハッシュ関数でハッシュ化
- ブラウザキャッシュ・バックエンドキャッシュとの整合性を保つ
- 基本的な衝突回避機構を備えている

#### `getPendingKey(text: string, voice?: string, voiceModel?: string): string`

- テキストハッシュと音声パラメータを統合してキーを生成
- 例: `"audio_123_ja-JP-Neural2-B"`

### 3. コアロジック

#### `getAudio(text, voice?, voiceModel?): Promise<Blob>`

Pending Map を活用した音声取得ロジック：

```
┌─ キーを生成
│
├─ Pending Map に進行中のリクエストがあるか確認
│  ├─ YES: 進行中のPromiseを返す [PENDING] ログ出力
│  └─ NO: 新規リクエスト
│
├─ fetchTTSFromAPI() でバックエンド API へリクエスト
│  └─ 完了時に Pending Map から削除
│
└─ Promiseを Pending Map に登録して返す
```

#### `fetchTTSFromAPI(text, voice?, voiceModel?): Promise<Blob>`

実際の TTS API へのリクエスト処理：

- 既存の実装と同一のエラーハンドリング
- base64 デコード処理は維持
- ログ出力フォーマットは既存仕様に準拠

#### `synthesizeSpeech(text, voice?, voiceModel?): Promise<Blob>` (公開 API)

Pending Map を経由する新しいラッパー関数：

```typescript
export async function synthesizeSpeech(...): Promise<Blob> {
  return getAudio(text, voice, voiceModel);
}
```

後方互換性を完全に保つため、既存の `synthesizeSpeech` と同じシグネチャで公開。

### 4. ログ出力の拡張

**ファイル**: `packages/web-app-vercel/lib/logger.ts`

新しいメソッドを追加：

```typescript
pending: (message: string) => {
  console.log(`%c${LOG_PREFIX} [PENDING]`, LOG_STYLES.data, message);
};
```

ログ出力例：

```
[Audicle] [PENDING] リクエスト待機: ブロッカー/リスク...
```

## 期待される効果

### パフォーマンス改善

| 指標                                   | 改善率                         |
| -------------------------------------- | ------------------------------ |
| HTTP リクエスト削減                    | (N-1)/N（N: 重複リクエスト数） |
| Vercel Function 実行削減               | (N-1)/N（N: 重複リクエスト数） |
| バックエンド Blob キャッシュコスト削減 | (N-1)/N（N: 重複リクエスト数） |
| ネットワークレイテンシ                 | 改善                           |

### コスト削減

- Google Cloud TTS API: コスト変化なし（Blob キャッシュがヒット）
- Vercel Functions: 実行回数 (N-1)/N 削減（N: 重複リクエスト数）
- ネットワーク帯域: (N-1)/N 削減（N: 重複リクエスト数）

## 互換性

### ✅ 維持される実装

- ブラウザ IndexedDB キャッシュ: 変更なし
- バックエンド Blob キャッシュ: 変更なし
- ハッシュ生成ロジック: 既存と同一
- エラーハンドリング: 既存実装を踏襲
- API レスポンス形式: 変更なし
- `synthesizeSpeech()` のシグネチャ: 変更なし

### ⚠️ 注意事項

- Pending Map はセッションメモリに保持（ページリロードで初期化）
- 同一ブラウザセッション内でのみ重複排除が有効

## テスト方法

### 1. ブラウザ DevTools でのログ確認

記事再生時、コンソールで以下のログを確認：

```
[Audicle] [PENDING] リクエスト待機: テキスト...   // 2回目のリクエスト
[Audicle] [API →] POST /api/synthesize            // 1回目のみ出力
```

### 2. Network タブでのリクエスト確認

- 同じテキストを複数回再生
- 2 回目以降の `POST /api/synthesize` が **発行されない** ことを確認

### 3. コンソールログでの検証

```javascript
// コンソール：
console.log("[Audicle] [API →] POST /api/synthesize"); // 1回
console.log("[Audicle] [PENDING] リクエスト待機: ..."); // 1回以上
```

## 使用例

```typescript
import { synthesizeSpeech } from "@/lib/api";

// 複数回呼び出し
const blob1 = await synthesizeSpeech("テキスト", "ja-JP-Neural2-B");
const blob2 = await synthesizeSpeech("テキスト", "ja-JP-Neural2-B");
const blob3 = await synthesizeSpeech("テキスト", "ja-JP-Neural2-B");

// 内部では：
// - 1回目: 新規リクエスト発行 → Pending Map に登録
// - 2回目: Pending Map で検出 → 1回目の Promise を返す [PENDING] ログ
// - 3回目: Pending Map で検出 → 1回目の Promise を返す [PENDING] ログ
```

## ファイル変更一覧

- `packages/web-app-vercel/lib/api.ts`: Pending Map ロジック追加
- `packages/web-app-vercel/lib/logger.ts`: `pending()` メソッド追加

## 実装参考

### 前: 重複リクエスト発生

```
ユーザーが先読み機能をトリガー
  → チャンク1リクエスト発行 (HTTP)
  → チャンク1リクエスト発行 (HTTP)  // 重複！
  → チャンク2リクエスト発行 (HTTP)
```

### 後: 重複リクエスト排除

```
ユーザーが先読み機能をトリガー
  → チャンク1リクエスト発行 (HTTP)
  → チャンク1リクエスト待機 (キャッシュから取得)  // 重複排除
  → チャンク2リクエスト発行 (HTTP)
```

## 今後の拡張可能性

1. **TTL（Time To Live）の実装**: Pending Map のエントリに有効期限を設定
2. **メモリ管理**: 古いリクエストを自動削除
3. **キャッシュクリア機能**: 明示的な Pending Map リセット機構
4. **リクエストのプログレス追跡**: 進行状況を UI に表示
