# Audicle Web App

Next.js ベースのモダンな Web アプリケーション。音楽プレイヤーのような直感的な UI で、Web ページの記事を音声読み上げします。

## ✨ 主な機能

- **記事抽出・表示**: URL から本文を抽出し、チャンク単位で表示
- **音声再生**: 連続再生、自動スクロール、クリック再生（Seek 機能）
- **2 倍速再生**: 高速な読み上げ体験
- **記事管理**: 保存した記事の一覧表示と管理機能
- **音声キャッシュ**: 3 チャンク先読みによるスムーズな再生
- **ログ機能**: 詳細なデバッグ情報出力
- **レスポンシブデザイン**: モバイル・デスクトップ対応

## 🛠️ 技術スタック

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Audio**: Web Audio API
- **Storage**: localStorage (記事保存)
- **Cache**: Map-based メモリキャッシュ

## 🚀 クイックスタート

### 前提条件

- Node.js 18+
- API サーバーが起動していること (`http://localhost:8000`)

### インストール & 起動

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて使用開始。

### 本番ビルド

```bash
npm run build
npm start
```

## ⚙️ 設定

`.env.local` で環境変数を設定：

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📱 使用方法

### 記事読み上げ

1. **記事一覧ページ** (`/`) にアクセス
2. **「+ 新しい記事を読む」** をクリック
3. **記事 URL を入力** して「読込」
4. **再生ボタン** をクリックして音声読み上げ開始

### 記事管理

- **記事一覧**: 保存済み記事の一覧表示
- **記事削除**: 各記事の削除ボタンで削除
- **記事再読**: タイトルクリックでリーダーページへ

### 再生コントロール

- **再生/一時停止**: 緑ボタンで切り替え
- **停止**: 赤ボタンで完全停止
- **Seek**: 任意の段落をクリックでそこから再生
- **自動スクロール**: 再生中の段落が自動で中央表示

## 🧪 テスト

### 基本機能テスト

```bash
# 1. 記事一覧ページが表示される
# 2. 新しい記事追加機能が動作する
# 3. 音声再生が2倍速で機能する
# 4. キャッシュが効いて高速再生される
```

### API 連携テスト

```bash
# コンソールログを確認
# - APIリクエスト/レスポンスログ
# - キャッシュヒット/ミスログ
# - 先読みログ
```

### 推奨テスト URL

- **技術記事**: Qiita, Zenn, はてなブログ
- **ニュース**: NHK, 主要新聞社
- **ブログ**: アメブロ, 個人ブログ

## 🏗️ アーキテクチャ

```
packages/web-app/
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # 記事一覧ページ
│   └── reader/page.tsx     # リーダーページ
├── components/
│   └── ReaderView.tsx      # 記事表示コンポーネント
├── hooks/
│   └── usePlayback.ts      # 再生制御フック
├── lib/
│   ├── api.ts              # APIクライアント
│   ├── audioCache.ts       # 音声キャッシュ
│   ├── logger.ts           # ログユーティリティ
│   └── storage.ts          # 記事ストレージ
└── types/
    └── api.ts              # 型定義
```

## 🔧 開発

### 主要コンポーネント

- **ReaderView**: 記事本文の表示とハイライト
- **usePlayback**: 音声再生のオーケストレーション
- **audioCache**: 音声データのキャッシュ管理
- **articleStorage**: localStorage ベースの記事保存

### 拡張方法

#### 新しい TTS エンジンの追加

`lib/api.ts` の `synthesizeSpeech` 関数を拡張：

```typescript
export async function synthesizeSpeech(
  text: string,
  voice = "ja-JP-Wavenet-B"
): Promise<Blob> {
  // エンジン選択ロジックを追加
  const engine = getSelectedEngine();
  return engine.synthesize(text, voice);
}
```

#### キャッシュ戦略のカスタマイズ

`lib/audioCache.ts` の `AudioCache` クラスを拡張：

```typescript
class AudioCache {
  // キャッシュサイズ制限を追加
  private maxSize = 50;
  // 永続化機能を追加
  saveToStorage() {
    /* ... */
  }
}
```

## 📊 パフォーマンス

- **初回再生**: API 呼び出し + 音声合成（~2-3 秒）
- **キャッシュ再生**: 即時再生（~0.1 秒）
- **先読み**: 3 チャンク分の音声をバックグラウンドで準備
- **メモリ使用**: 24 時間自動クリーンアップ

## 🐛 トラブルシューティング

### API サーバーが接続できない

```bash
# APIサーバーの起動確認
cd ../api-server
docker-compose ps

# ログ確認
docker-compose logs api-server
```

### 音声が再生されない

```bash
# ブラウザのコンソールを確認
# CORSエラーやネットワークエラーがないかチェック
```

### キャッシュが効かない

```bash
# コンソールで "CACHE MISS" が表示されるか確認
# 同じテキストで再テストして "CACHE HIT" になるか確認
```

## 📖 関連ドキュメント

- [プロジェクト全体 README](../../README.md)
- [開発ブランチレポート](BRANCH_REPORT.md)
- [実装完了レポート](COMPLETION_REPORT.md)
- [API サーバー仕様](../api-server/README.md)
