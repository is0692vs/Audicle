# 自動スクロール機能 テスト・検証ガイド

## テスト環境準備

### 前提条件
- Node.js 18+ がインストール済み
- npm/yarn パッケージマネージャ利用可能
- Chrome DevTools またはブラウザの開発者ツール利用可能

### セットアップ

```bash
cd /workspaces/Audicle/packages/web-app-vercel
npm install
npm run dev
```

## テストシナリオ

### 1. 基本動作テスト

#### 1.1 スクロール機能の確認

**手順:**
1. http://localhost:3000/reader にアクセス
2. URLを入力して記事を読み込む（例: https://qiita.com/... など）
3. 「再生」ボタンをクリック
4. ブラウザのコンソール（F12）を開く

**確認項目:**
- [ ] チャンク再生時に以下のログが表示される
  ```
  [useAutoScroll] コンテナ内スクロール: chunkId=chunk-xxx, scrollTop=yyy
  ```
- [ ] 読み上げ中のチャンクが自動的にスクロールして表示される
- [ ] スクロール先がコンテナの中央付近に配置されている
- [ ] スクロール動作がスムーズ（急激な移動ではない）

#### 1.2 チャンク切り替え時の挙動

**手順:**
1. 再生中の記事で一時停止
2. 別のチャンクをクリック
3. 再生を再開

**確認項目:**
- [ ] クリックしたチャンクから再生が開始される
- [ ] スクロール位置がクリックしたチャンク位置に移動
- [ ] スクロール時のアニメーション（smooth動作）が確認できる

### 2. エッジケーステスト

#### 2.1 最初のチャンク

**手順:**
1. 記事を読み込み
2. 最初のチャンクをクリック
3. 「再生」ボタンをクリック

**確認項目:**
- [ ] スクロール計算が正確に行われる
- [ ] エラーがコンソールに表示されない

#### 2.2 最後のチャンク

**手順:**
1. 記事を最後まで再生
2. 最後のチャンク再生時のスクロール

**確認項目:**
- [ ] 最後のチャンクが画面中央に配置される
- [ ] スクロール完了後にエラーが発生していない

#### 2.3 存在しないチャンク ID

**手順:**
1. Developer Tools コンソールで以下を実行
   ```javascript
   // 存在しないchunk-IDを検索
   document.querySelector('[data-audicle-id="invalid-chunk-id"]')
   ```

**確認項目:**
- [ ] nullが返される
- [ ] エラーは発生しない

### 3. モバイル互換性テスト

#### 3.1 ブラウザレスポンシブモード

**手順:**
1. Chrome DevTools を開く（F12）
2. Responsive Mode を有効化（Ctrl+Shift+M）
3. 異なるデバイスサイズを選択
   - iPhone SE（375x667）
   - iPad（1024x1366）
   - Galaxy S10（360x800）
4. 記事を読み込んで再生

**確認項目:**
- [ ] 各デバイスサイズでスクロールが正常に動作
- [ ] スクロール計算に誤りがない
- [ ] ビューポート高さが低い場合でも適切にスクロール

#### 3.2 実デバイスでのテスト（オプション）

**手順:**
1. 実際のモバイルデバイスで http://localhost:3000/reader にアクセス
   - ローカルネットワーク経由で接続
   - 例: http://192.168.x.x:3000/reader
2. 記事を読み込んで再生

**確認項目:**
- [ ] タッチスクロール時に自動スクロール機能が干渉しない
- [ ] ジェスチャーが正常に認識される
- [ ] パフォーマンス低下がない

### 4. ネットワーク監視テスト

#### 4.1 Supabase 通信なし確認

**手順:**
1. Chrome DevTools を開く（F12）
2. Network タブを選択
3. 記事を読み込み → 再生開始

**確認項目:**
- [ ] Supabase への API 呼び出しが表示されない
  - `supabase.com` ドメインへのリクエストなし
  - `api.supabase.io` へのリクエストなし
- [ ] audioCache の取得による API 呼び出しのみ表示
  - `/api/synthesize` などのローカルAPI

**期待されるリクエスト:**
```
✅ /api/synthesize - 音声合成API（ローカル）
✅ audio blob - 音声ファイルの取得
❌ supabase - Supabase通信（なし）
```

#### 4.2 パフォーマンス確認

**手順:**
1. Chrome DevTools Performance タブを選択
2. 記録を開始
3. チャンク再生 → スクロール発生
4. 記録を停止

**確認項目:**
- [ ] スクロール操作の Main Thread 時間が 16ms 以下
- [ ] Frame rate が 60 FPS に近い
- [ ] Jank（フレーム落ち）がない

### 5. ハイライト機能との連携テスト

**手順:**
1. 記事を再生
2. 再生中のチャンクのハイライト（黄色背景）を確認

**確認項目:**
- [ ] 再生中のチャンクにハイライト（bg-yellow-100）が表示される
- [ ] ハイライトとスクロール位置が同期している
- [ ] スケーリング効果（scale-105）が正常に機能

### 6. ブラウザ互換性テスト

#### テスト対象ブラウザ

| ブラウザ | バージョン | 状態 | 特記事項 |
|--------|----------|------|--------|
| Chrome | 最新 | ✅ | 本推奨環境 |
| Firefox | 最新 | ✅ | smooth対応確認済み |
| Safari | 最新 | ✅ | iOS上での動作確認 |
| Edge | 最新 | ✅ | Chromium ベース |
| IE 11 | - | ⚠️ | フォールバック動作 |

**手順:**
1. 各ブラウザで http://localhost:3000/reader にアクセス
2. 記事を読み込んで再生
3. コンソールログを確認

**確認項目:**
- [ ] Chrome, Firefox, Safari: `[useAutoScroll] コンテナ内スクロール` ログ表示
- [ ] IE 11: `scrollIntoView(true)` フォールバック動作確認

## トラブルシューティング

### スクロールが発生しない場合

**確認項目:**
1. コンソールでエラーがないか確認
   ```
   [useAutoScroll] チャンクが見つかりません: chunkId
   ```
   - チャンク ID の不一致を確認
   - `data-audicle-id` 属性が正確にセットされているか確認

2. `containerRef` が正しく参照されているか確認
   ```javascript
   // DevTools コンソール
   document.querySelector('[data-audicle-id="chunk-123"]')?.scrollIntoView()
   ```

3. 要素の可視性確認
   - チャンク要素が DOM に存在するか
   - CSS で `display: none` になっていないか

### スクロール計算が不正確な場合

**確認項目:**
1. コンテナの height と overflow を確認
   ```javascript
   const container = document.querySelector('[data-audicle-id="..."]').parentElement;
   console.log(getComputedStyle(container));
   ```

2. 要素の getBoundingClientRect を確認
   ```javascript
   const element = document.querySelector('[data-audicle-id="chunk-123"]');
   console.log(element.getBoundingClientRect());
   ```

### パフォーマンス問題

**確認項目:**
1. DevTools Performance タブでプロファイリング
2. `scrollTo()` の Main Thread 時間を確認
3. 不要な再レンダリングがないか確認

## 最終チェックリスト

実装の完全性確認：

- [ ] ✅ スクロール機能が正常に動作
- [ ] ✅ すべてのエッジケースに対応
- [ ] ✅ モバイルデバイスで動作確認
- [ ] ✅ Supabase 通信なし（ネットワーク監視済み）
- [ ] ✅ DB 構造に変更なし
- [ ] ✅ 既存機能との干渉なし
- [ ] ✅ ハイライト機能と同期
- [ ] ✅ ブラウザ互換性確認
- [ ] ✅ パフォーマンス問題なし
- [ ] ✅ コンソールエラーなし

## デバッグモード

開発時のデバッグを容易にするため、以下のログを活用：

```javascript
// コンソールで以下を実行してログレベルを制御
window.DEBUG_AUTO_SCROLL = true;  // ログを有効化
window.DEBUG_AUTO_SCROLL = false; // ログを無効化
```

## 参考資料

- [MDN: Element.scrollIntoView()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView)
- [MDN: ScrollToOptions](https://developer.mozilla.org/en-US/docs/Web/API/ScrollToOptions)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

---

**テストガイド作成日**: 2025-11-07
**対応実装版**: useAutoScroll v1.0
