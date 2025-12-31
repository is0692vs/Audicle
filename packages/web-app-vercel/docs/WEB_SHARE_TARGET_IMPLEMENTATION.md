# Web Share Target API 実装サマリー

## 概要

スマートフォンのChromeで記事を閲覧中に、共有メニューから「Audicle」を選択することで、記事を直接読み込みプレイリストに追加できる機能を実装しました。

## 実装ファイル

### 1. `public/manifest.json`

PWAのマニフェストファイルに`share_target`設定を追加：

```json
{
  "share_target": {
    "action": "/share-target",
    "method": "POST",
    "enctype": "application/x-www-form-urlencoded",
    "params": {
      "url": "url",
      "title": "title"
    }
  }
}
```

この設定により、OSの共有メニューにAudicleが表示されるようになります。

**セキュリティ**: POSTメソッドを使用することでCSRF攻撃を防ぎ、URLパラメータに機密情報が露出することを防ぎます。

### 2. `app/share-target/route.ts`

共有された記事を処理するRoute Handler：

#### 主な機能

- **POST/GET両対応**: Web Share Target API（POST）と後方互換性（GET）
- **FormDataの検証**: POSTリクエストでは`FormData`から`url`と`title`を取得
- **URLスキーム検証**: HTTPSとHTTPのみを許可、XSS攻撃を防止
- **認証チェック**: 未ログインの場合は適切なリターンURLを含めてログインページへリダイレクト
- **デフォルトプレイリストの取得**: `getOrCreateDefaultPlaylist()`を使用
- **記事の作成/更新**: Supabaseとローカルストレージの両方に対応
- **アトミックな追加**: RPC関数`add_playlist_item_at_end`でrace conditionを防止
- **成功時のリダイレクト**: `/share-target/success`へリダイレクト
- **構造化ログ**: JSON形式でログを記録、デバッグを容易に

### 3. `app/share-target/AutoCloseComponent.tsx`

記事追加成功後のUIを表示するクライアントコンポーネント：

#### 主な機能

- **視覚的フィードバック**: チェックマークアイコンと成功メッセージを表示
- **自動クローズ**: 1秒後に`window.close()`を試行
- **フォールバック**: ウィンドウが閉じられない場合はNext.jsルーターでホームへリダイレクト

### 4. `app/share-target/__tests__/route.test.ts`

包括的なテストケース：

- URLパラメータがない場合のリダイレクト（GET/POST両方）
- 無効なURLスキームの検証（javascript:、data:、ftp:など）
- 未ログイン時のリダイレクト
- 記事追加成功のシナリオ
- デフォルトプレイリスト取得失敗のエラーハンドリング
- 記事追加失敗のエラーハンドリング
- FormDataの正しい解析

## ユーザーフロー

```
スマホChrome（記事閲覧中）
    ↓
共有メニューを開く
    ↓
「Audicle」を選択
    ↓
Audicle PWAが開く（/share-target?url=記事URL）
    ↓
【認証チェック】
    ├─ 未ログイン → ログインページへリダイレクト
    └─ ログイン済み → 次のステップへ
    ↓
デフォルトプレイリストに記事を追加
    ↓
成功メッセージを表示（1秒）
    ↓
自動的にウィンドウが閉じて元のChromeに戻る
```

## 技術的なポイント

### PWA要件

Web Share Target APIはPWA（Progressive Web App）の機能の一部です。PWAの要件：

- `manifest.json`が正しく設定されている
- HTTPSで配信されている（localhost除く）
- Service Workerが登録されている（既存のSerwist設定で対応済み）

### 認証の仕組み

- 同じブラウザでログインしていればCookie/セッションが共有される
- NextAuthのセッション情報を`auth()`で取得
- 未ログインの場合は`callbackUrl`パラメータを使って、ログイン後に元の処理を継続

### クロスデバイス同期

- Supabaseを使用して記事とプレイリストを管理
- スマホで追加した記事は即座にSupabaseに保存される
- PCで同じアカウントにログインしていれば、リアルタイムで同期される

### エラーハンドリング

- 各ステップでエラーが発生した場合、適切なエラーメッセージを表示
- console.errorでデバッグ情報を出力
- ユーザーにはフレンドリーなエラーメッセージを表示

## 制約事項

### PWAは一瞬開く必要がある

Web Share Target APIの仕様上、PWAは必ず一瞬開きます。完全にバックグラウンドで処理することはできません。

- 実現可能な最善のUX: 「一瞬だけ開いてすぐ閉じる」（約0.5-1秒）
- 完全なバックグラウンド処理にはネイティブアプリが必要

### ブラウザ対応

- Chrome（Android）: ✅ 完全対応
- Safari（iOS）: ⚠️ 限定的なサポート（iOS 15+で一部対応）
- Firefox（Android）: ⚠️ 実装中

## テスト

すべてのテストケースが合格：

```bash
npm test -- app/share-target/__tests__/route.test.ts
```

TypeScriptのコンパイルもエラーなし：

```bash
npx tsc --noEmit --skipLibCheck
```

## セキュリティ

CodeQL による静的解析を実施し、セキュリティ上の問題は検出されませんでした。

## ドキュメント

`README.md`に以下を追加：

- 主な機能リストに「Web Share Target API」を追加
- 使用方法セクションにスマホからの共有手順を追加
- PWAの要件と制約事項の説明

## 今後の拡張案

1. **共有内容の拡張**
   - テキスト選択部分の共有
   - 複数URLの一括共有

2. **UXの改善**
   - 追加先プレイリストの選択機能
   - トースト通知の追加

3. **オフライン対応**
   - Service Workerでのオフラインキュー
   - ネットワーク復帰時の自動同期
