# Edge TTS Server for Audicle

Microsoft Edge の Text-to-Speech 機能を使用した音声合成サーバーです。  
Audicle Chrome 拡張機能と連携して、高品質な日本語音声合成を提供します。

## 🎯 サーバーの責任範囲

このサーバーは**純粋な音声合成専用サーバー**として設計されています：

### ✅ 責任範囲内

- **テキスト受信**: HTTP リクエストでテキストを受け取る
- **音声合成**: Microsoft Edge TTS で MP3 生成
- **MP3 配信**: 生成した音声を HTTP レスポンスで返す
- **パラメータ制御**: 音声、話速、音程の調整
- **ログ出力**: 受信テキストの先頭 50 文字をデバッグログに表示

### ❌ 責任範囲外

- **順序制御**: テキストの並び順はクライアント側（Chrome 拡張）が管理
- **キューイング**: 複数リクエストの順序管理はクライアント側が実行
- **ハイライト**: 再生位置の同期表示はクライアント側が担当
- **DOM 操作**: ページ内容の解析・抽出は一切行わない

## ✨ 特徴

- **高品質**: Microsoft Edge TTS エンジンによる自然な音声合成
- **日本語対応**: 複数の日本語音声を選択可能
- **REST API**: シンプルな HTTP API インターフェース
- **軽量**: 必要最小限の依存関係
- **高速**: 段階的読み込みに対応した効率的なレスポンス
- **デバッグ対応**: リクエストテキストの内容をログ出力

## 🚀 クイックスタート ver for Audicle

Microsoft Edge の Text-to-Speech 機能を使用した音声合成サーバーです。  
Audicle Chrome 拡張機能と連携して、高品質な日本語音声合成を提供します。

## 🎯 特徴

- **高品質**: Microsoft Edge TTS エンジンによる自然な音声合成
- **日本語対応**: 複数の日本語音声を選択可能
- **REST API**: シンプルな HTTP API インターフェース
- **軽量**: 必要最小限の依存関係
- **互換性**: 既存の Audicle アーキテクチャに完全統合

## 🚀 クイックスタート

### 1. 依存関係のインストール

```bash
# 仮想環境がアクティブであることを確認
source venv/bin/activate

# パッケージインストール (既にインストール済みの場合はスキップ)
pip install -r requirements.txt
```

### 2. サーバー起動

```bash
# 起動スクリプトを使用 (推奨)
./start_server.sh

# または直接実行
python server.py
```

### 3. 動作確認

```bash
# 別のターミナルでテスト実行
python test_server.py
```

## 📡 API エンドポイント

### ヘルスチェック

```bash
GET /
```

### 利用可能な音声取得

```bash
GET /voices
```

### 音声合成 (メイン)

```bash
POST /synthesize
Content-Type: application/json

{
  "text": "こんにちは、音声合成のテストです。",
  "voice": "ja-JP-NanamiNeural",
  "rate": "+0%",
  "pitch": "+0Hz"
}
```

### 音声合成 (シンプル - Audicle 互換)

```bash
POST /synthesize/simple
Content-Type: application/json

{
  "text": "こんにちは"
}
```

## 🔧 Audicle 統合

Audicle Chrome 拡張機能から使用する場合:

1. このサーバーを起動 (`./start_server.sh`)
2. `audicle/background.js` に `EdgeTTSSynthesizer` クラスを追加
3. `audicle/config.json` で `"synthesizerType": "edge_tts"` に設定

## 🎤 利用可能な音声

デフォルトでは以下の日本語音声が利用可能です:

- `ja-JP-NanamiNeural` (女性、デフォルト)
- `ja-JP-KeitaNeural` (男性)
- `ja-JP-AoiNeural` (女性)
- `ja-JP-DaichiNeural` (男性)
- `ja-JP-MayuNeural` (女性)
- `ja-JP-NaokiNeural` (男性)
- `ja-JP-ShioriNeural` (女性)

音声一覧は `/voices` エンドポイントで確認できます。

## 🔧 設定オプション

### 話速調整

```json
{
  "rate": "+50%"   // 1.5倍速
  "rate": "-25%"   // 0.75倍速
  "rate": "+0%"    // 標準速度 (デフォルト)
}
```

### 音程調整

```json
{
  "pitch": "+5Hz"   // 少し高く
  "pitch": "-10Hz"  // 少し低く
  "pitch": "+0Hz"   // 標準 (デフォルト)
}
```

## 📂 ファイル構成

```
python-tts-server/
├── server.py           # メインサーバー
├── test_server.py      # テストスクリプト
├── start_server.sh     # 起動スクリプト
├── requirements.txt    # 依存関係
├── README.md          # このファイル
└── venv/              # Python仮想環境
```

## 🚨 トラブルシューティング

### サーバーが起動しない

```bash
# 仮想環境の確認
source venv/bin/activate
which python  # 仮想環境のPythonが使用されているか確認

# 依存関係の再インストール
pip install -r requirements.txt
```

### 音声合成エラー

```bash
# ログを確認
python server.py  # エラーメッセージを確認

# テストスクリプトで詳細確認
python test_server.py
```

### ポート競合

```bash
# ポート8001が使用中の場合、server.pyの最後の行を変更:
# uvicorn.run(app, host="0.0.0.0", port=8002)  # 8002に変更
```

## 🔄 開発者向け

### 新しい音声言語の追加

`list_voices()` 関数で言語フィルターを変更:

```python
# 英語音声も含める場合
if voice["Locale"].startswith(("ja", "en")):
```

### カスタムエンドポイント追加

FastAPI の標準的な方法でエンドポイントを追加できます:

```python
@app.post("/custom_endpoint")
async def custom_function():
    # カスタム処理
    pass
```

## 📄 ライセンス

このプロジェクトは Audicle プロジェクトの一部として開発されています。
