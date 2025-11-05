# Docker Edge TTS Server for Audicle

この Docker 版 Edge TTS サーバーは、環境変数による設定管理を採用した音声合成サーバーです。

## 🎯 特徴

- **Docker 化**: 環境差によるトラブルを回避
- **環境変数設定**: .env ファイルによる設定管理
- **シンプル設計**: 複雑な設定スクリプト不要
- **高品質**: Microsoft Edge TTS による自然な日本語音声

## 📋 必要な環境

- Docker
- Docker Compose

## 🚀 クイックスタート

### 1. サーバー起動

```bash
cd docker-tts-server
docker-compose up -d
```

### 2. 動作確認

```bash
# ヘルスチェック
curl http://localhost:8001/

# 音声合成テスト
curl -X POST "http://localhost:8001/synthesize/simple" \
     -H "Content-Type: application/json" \
     -d '{"text":"こんにちは、これはテストです"}' \
     --output test_audio.mp3
```

### 3. Chrome 拡張の設定

`audicle/config.json` で音声合成エンジンを指定：

```json
{
  "synthesizerType": "edge_tts_docker"
}
```

## ⚙️ 設定管理

### 環境変数による設定 (.env)

全ての設定は `.env` ファイルで管理します：

```bash
# サーバー設定
TTS_HOST_PORT=8001          # ホストマシンのポート
TTS_HOST_IP=0.0.0.0         # バインドするIP

# 音声合成設定
DEFAULT_VOICE=ja-JP-NanamiNeural
DEFAULT_RATE=+0%
DEFAULT_PITCH=+0Hz

# Docker設定
COMPOSE_PROJECT_NAME=audicle-edge-tts
```

### ポート変更

異なるポートを使用する場合：

```bash
# .env ファイルを編集
TTS_HOST_PORT=8002

# サービス再起動
docker-compose down
docker-compose up -d
```

## 🐳 Docker コマンド

```bash
# サービス起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# サービス停止
docker-compose down

# 再起動
docker-compose restart

# イメージ削除（完全リセット）
docker-compose down --rmi all --volumes
```

## 🧪 API エンドポイント

### ヘルスチェック

- `GET /` - サーバー状態確認

### 音声合成（Audicle 用）

- `POST /synthesize/simple` - テキスト → MP3 変換

リクエスト例:

```json
{
  "text": "こんにちは、世界"
}
```

### 音声一覧

- `GET /voices` - 利用可能な音声リスト

### API ドキュメント

- http://localhost:8001/docs (Swagger UI)

## 🚨 トラブルシューティング

### ポートが使用中の場合

```bash
# ポート使用状況確認
lsof -i :8001

# .env でポート変更
TTS_HOST_PORT=8002
```

### コンテナが起動しない場合

```bash
# ログ確認
docker-compose logs

# イメージを再ビルド
docker-compose build --no-cache
```

### LAN からアクセスできない場合

1. ファイアウォール設定確認
2. IP アドレス確認: `ip addr show`
3. テストコマンド: `curl http://[SERVER_IP]:8001/`

## 🔧 開発者向け

### ローカル開発

```bash
# Python で直接起動（デバッグ用）
cd docker-tts-server
python server.py
```

### カスタマイズ

- `server.py`: API ロジック
- `Dockerfile`: コンテナ設定
- `docker-compose.yml`: サービス定義
- `.env`: 環境変数

## 📊 パフォーマンス

- 初回起動: 30-60 秒（依存関係のダウンロード）
- 音声生成: 0.5-2.0 秒（テキスト長による）
- メモリ使用量: 約 200-400MB
- ディスク使用量: 約 800MB（イメージ含む）

---

**関連ファイル**:

- `/audicle/background.js`: 音声合成モジュール
- `/audicle/config.json`: 合成エンジン設定
