[English version](./README.md)

# Audicle

Audicle（Article + Audio）は、ウェブページ上の記事コンテンツを音声で読み上げるプラットフォームです。

快適な「ながら読書」体験を提供します。

## プロダクトラインナップ

Audicleは、利用スタイルに合わせて選べる3つの形態で提供されています。

### 1. Vercelホスティング版（招待制）

最も手軽に始められる、クラウド版のWebアプリケーションです。

- **特徴**:
  - アカウント作成やサーバー設定が不要
  - 最新の機能をすぐに利用可能
  - 高品質な音声を安定して提供（Supabase + Vercel Storage）
- **アクセス**:
  - 現在、招待制で運用しています。利用をご希望の方はお問い合わせください。

### 2. セルフホストWebアプリケーション

ご自身のサーバー環境でAudicleを運用したい方向けのバージョンです。

- **特徴**:
  - 軽量でシンプル
  - 外部サービスへの依存が少ない
  - 簡単にデプロイ可能
- **セットアップ**:
  - `packages/web-app` を参照してください。

### 3. Chrome拡張機能

ブラウザに直接インストールして、閲覧中の記事をその場で読み上げるための拡張機能です。

- **特徴**:
  - Webサイトを離れることなく、ワンクリックで読み上げを開始
  - シンプルで直感的な操作
  - Google TTS（デフォルト）または自前の `api-server` を利用可能
- **インストール**:
  - `packages/chrome-extension` を参照し、デベロッパーモードで読み込んでください。

## 主な機能

- **ワンクリック再生**: 読みたい段落をクリックするだけで再生が開始されます
- **インテリジェントな本文抽出**: 広告などを除去し、本文のみを抽出
- **再生箇所のハイライト**: どこを読んでいるかが一目でわかります
- **複数TTSエンジン対応**: 用途に応じて音声合成エンジンを選択可能

## 技術スタック

本プロジェクトは、以下の技術スタックで構築されています。

- **`web-app-vercel` (フル機能フロントエンド)**
  - **フレームワーク**: Next.js 16, React 19
  - **言語**: TypeScript
  - **UI**: Tailwind CSS
  - **テスト**: Jest, Playwright
  - **データベース**: Supabase, Vercel Storage
  - **認証**: NextAuth.js

- **`web-app` (シンプル版フロントエンド)**
  - **フレームワーク**: Next.js 15, React 19
  - **言語**: TypeScript
  - **UI**: Tailwind CSS

- **`api-server` (バックエンド)**
  - **フレームワーク**: FastAPI (Python)
  - **TTSエンジン**: Google Cloud Text-to-Speech
  - **デプロイ**: Docker

- **`chrome-extension` (ブラウザ拡張機能)**
  - **言語**: JavaScript
  - **ライブラリ**: Mozilla Readability.js

## アーキテクチャ概要

Audicleは、モノリポ構成の複数のパッケージから成り立っています。

```
/packages
├── api-server/        # 音声合成を行うAPIサーバー (Python/FastAPI)
├── chrome-extension/  # ブラウザ拡張機能
├── db/                # データベーススキーマ管理
├── web-app/           # シンプルなセルフホスト用Webアプリ
└── web-app-vercel/    # Vercelホスティング用フル機能Webアプリ
```

- **`chrome-extension`** は、閲覧中のページの本文を抽出します。TTSは直接行うか、**`api-server`** に送信して行います。
- **`web-app`** は、軽量な記事ビューワー兼読み上げアプリです。
- **`web-app-vercel`** は、Vercelでのホスティングに最適化されており、ユーザー認証、データベース連携、高度な再生機能を含みます。
- **`api-server`** は、Google Cloud Text-to-Speech を利用した堅牢な TTS API を提供し、Chrome拡張機能やセルフホスト環境から利用されます。

## APIエンドポイントの例

セルフホスト版の`api-server`は、以下のエンドポイントを提供します。

### テキストを音声合成する

```bash
curl -X POST "http://localhost:8000/synthesize" \
-H "Content-Type: application/json" \
-d '{"text": "これはテストです"}' \
--output test.mp3
```

成功すると、`test.mp3`というファイル名で音声データが保存されます。

## トラブルシューティング

### `api-server`が起動しない

- **問題**: `docker-compose up` を実行しても、コンテナが正常に起動しない。
- **解決策**:
  - `packages/api-server/credentials` ディレクトリに、Google Cloudの認証情報ファイル (`credentials.json`) が正しく配置されているか確認してください。
  - Dockerが正常に動作しているか確認してください。

### Chrome拡張機能が動作しない

- **問題**: 拡張機能のアイコンをクリックしても反応がない、または読み上げが開始されない。
- **解決策**:
  - `api-server`モードを使用している場合、サーバーが正しく起動しているか確認してください。
  - 拡張機能の設定で、APIサーバーのURLが正しく設定されているか確認してください (`http://localhost:8000`)。
  - デベロッパーツールのコンソールにエラーメッセージが表示されていないか確認してください。

## 貢献

貢献を歓迎します！詳細は[貢献ガイドライン（日本語）](CONTRIBUTING.ja.md)または[貢献ガイドライン（英語）](CONTRIBUTING.md)をご覧ください。

## ライセンス

本プロジェクトはMITライセンスです。詳細は[LICENSE](LICENSE)ファイルをご覧ください。
