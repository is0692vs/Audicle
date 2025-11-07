# Audicle APIサーバー

Audicle APIサーバーは、Webページからのテキスト抽出と、Google Cloud Text-to-Speechを利用した音声合成機能を提供します。

Webアプリケーション版およびChrome拡張機能版Audicleのバックエンドとして動作します。

## ✨ 主な機能

- **テキスト抽出**: [Readability.js](https://github.com/mozilla/readability) を利用し、WebページのURLから広告などの不要な要素を取り除き、本文コンテンツのみを抽出します。
- **音声合成**: Google Cloud Text-to-Speech APIを利用し、抽出したテキストを自然な音声データ（MP3）に変換します。

## 🛠️ 技術スタック

- **バックエンド**: Python 3.11+, [FastAPI](https://fastapi.tiangolo.com/ja/)
- **テキスト抽出**: Node.js, [Readability.js](https://github.com/mozilla/readability)
- **音声合成**: Google Cloud Text-to-Speech API
- **コンテナ化**: Docker, Docker Compose

## 🚀 セットアップ

### 前提条件

- [Python 3.11+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [Docker](https://www.docker.com/) および [Docker Compose](https://docs.docker.com/compose/)
- Text-to-Speech APIが有効化された[Google Cloud Platform (GCP)](https://cloud.google.com/) アカウント

### インストール手順

1. **GCPサービスアカウントキーの準備**
   - GCPコンソールでサービスアカウントを作成し、JSON形式のキーファイルをダウンロードします。
   - このキーファイルは、APIサーバーがGCPのサービスを利用するために必要です。

2. **認証情報ファイルの配置**
   - `packages/api-server`ディレクトリ内に`credentials`という名前のディレクトリを作成します。
   - ダウンロードしたJSONキーファイルを`service-account.json`という名前で`credentials`ディレクトリに配置します。
     ```bash
     # packages/api-server ディレクトリに移動
     cd packages/api-server

     # credentials ディレクトリを作成
     mkdir credentials

     # ダウンロードしたキーファイルを配置
     mv /path/to/your-downloaded-key.json credentials/service-account.json
     ```
   > **⚠️ 注意**: `credentials/service-account.json`は`.gitignore`によってリポジトリには含まれません。安全に管理してください。

3. **Dockerコンテナのビルドと起動**
   - `packages/api-server`ディレクトリで、以下のコマンドを実行します。
     ```bash
     docker-compose up --build -d
     ```
   - サーバーがバックグラウンドで起動し、`http://localhost:8000`で利用可能になります。

## 📊 APIエンドポイント

APIの動作確認は、`curl`コマンドなどで行うことができます。

### GET /

サーバーのステータス情報を返します。

**実行例:**
```bash
curl http://localhost:8000/
```

**レスポンス例:**
```json
{
  "status": "ok",
  "message": "Audicle API Server is running."
}
```

### POST /extract

指定されたURLからWebページのテキストコンテンツを抽出します。

**リクエスト:**
```json
{
  "url": "https://example.com"
}
```

**実行例:**
```bash
curl -X POST http://localhost:8000/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://zenn.dev/example/articles/12345"}'
```

**レスポンス:**
```json
{
  "title": "ページのタイトル",
  "chunks": ["抽出されたテキストのチャンク1", "チャンク2", "..."]
}
```

### POST /synthesize

テキストを音声（MP3ファイル）に変換します。

**リクエスト:**
```json
{
  "text": "こんにちは、世界！",
  "voice": "ja-JP-Wavenet-B"
}
```
> `voice`パラメータはオプションです。指定しない場合は、デフォルトの音声（`ja-JP-Wavenet-B`）が使用されます。

**レスポンス:**

MP3形式の音声ファイルが返されます。

**実行例:**
```bash
curl -X POST http://localhost:8000/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "これはテストです"}' \
  --output test.mp3
```
> 実行すると、カレントディレクトリに音声ファイル `test.mp3` が保存されます。

## ⚙️ 設定

- **デフォルト音声**: `ja-JP-Wavenet-B` (日本語, WaveNet)
- **オーディオ形式**: MP3
- **フォールバック**: 音声合成に失敗した場合、プロジェクト内の`fallback.mp3`が返されます。

## 🔧 開発（Dockerなしでの実行）

Dockerを使用せずにローカル環境で直接サーバーを起動することも可能です。

1. **Python依存関係のインストール**
   ```bash
   pip install -r requirements.txt
   ```

2. **環境変数の設定**
   - GCP認証情報へのパスを環境変数に設定します。
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS="credentials/service-account.json"
     ```

3. **サーバーの起動**
   ```bash
   python main.py
   ```

## 🐛 トラブルシューティング

### サーバーが起動しない、またはAPIがエラーを返す

- **Dockerコンテナのログを確認**:
  ```bash
  docker-compose logs api-server
  ```
  エラーメッセージ（特にGCP認証に関するもの）を確認してください。

- **GCP認証情報の確認**:
  - `credentials/service-account.json`が正しいパスに配置されているか確認してください。
  - GCPコンソールでText-to-Speech APIが有効になっているか確認してください。
