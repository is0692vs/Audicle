## 目的

このドキュメントは、プロジェクト内で散在している音声（voice）設定を 1 箇所で一元管理できるようにするための現状把握と、リスクを抑えた変更手順を示します。

重要: このファイル以外の変更は行わず、ここに示した手順に従って段階的にコード修正を行ってください。

## 現状把握（ハードコードされている場所一覧）

以下はリポジトリ内で検出した、voice 名や既定音声がハードコードされている場所です。これらは将来的に 1 箇所に集約すべき箇所です。

- `packages/chrome-extension/background.js` — `voice: config.voice || "ja-JP-Neural2-B"`（APIServerSynthesizer の呼び出し）。
- `packages/chrome-extension/config.json` — `"voice": "ja-JP-Neural2-B"`（設定ファイル）。
- `packages/api-server/main.py` — API のデフォルト `voice: str = "ja-JP-Neural2-B"`。
- `packages/web-app/lib/api.ts` — `voice: string = "ja-JP-Neural2-B"`（API 呼び出し既定）。
- `_archive/docker-tts-server/.env` — `DEFAULT_VOICE=ja-JP-NanamiNeural`（アーカイブ内の旧 docker 構成）。
- `_archive/google-tts-server/docker-compose.yml` — `GOOGLE_TTS_DEFAULT_VOICE: ${GOOGLE_TTS_DEFAULT_VOICE:-ja-JP-Standard-A}`（アーカイブ）。
- `_archive/docker-tts-server/server.py` — `voice: Optional[str] = "ja-JP-NanamiNeural"`（アーカイブ）。
- `_archive/google-tts-server/server.py` — `_DEFAULT_VOICE = os.getenv("GOOGLE_TTS_DEFAULT_VOICE", "ja-JP-Wavenet-B")`（アーカイブ）。
- `packages/completion-report.md` — ドキュメント中のサンプルに `ja-JP-Neural2-B` が使用されている。
- `packages/chrome-extension/AUDIO_SYNTHESIS_MODULES.md` — ドキュメント中に `ja-JP-NanamiNeural` 記載あり（更新予定）。
- `packages/chrome-extension/README.md` — curl サンプルに `ja-JP-Neural2-B` を参照。
- `packages/chrome-extension/docs/edge-tts-integration-report.md` — `ja-JP-NanamiNeural` がデフォルトとして記載（更新予定）。
- `_archive/python-tts-server/*` — 複数箇所で `ja-JP-NanamiNeural` を使用（アーカイブ）。

※上記はコード検索（正規表現: Nanami|Wavenet|Standard|"voice"|"ja-JP-"）による抽出結果を要約しています。アーカイブ内にも古い実装が残っているため、本番に影響するメインの実装（`packages/` 以下）とアーカイブ（`_archive/`）を区別して扱ってください。

※上記はコード検索（正規表現: Nanami|Wavenet|Standard|"voice"|"ja-JP-"）による抽出結果を要約しています。アーカイブ内にも古い実装が残っているため、本番に影響するメインの実装（`packages/` 以下）とアーカイブ（`_archive/`）を区別して扱ってください。

## 設計方針（要約）

目標: 音声設定（default voice）を 1 箇所から管理可能にし、次の要件を満たすこと。

- 可搬性: ローカル開発・docker・拡張（Chrome extension）・Web アプリが同じ設定を参照できる。
- 安全性: 本番では明示的に設定された値のみ使い、ワイルドカードや不明な voice のまま実行しない。
- 後方互換: 既存のハードコードされた値は段階的に移行する。

推奨アプローチ（段階的）:

1. 設定ストアとして環境変数を採用する（例: `AUDICLE_DEFAULT_VOICE`）。理由: docker-compose / cloud / ローカルどこでも使いやすい。
   - 例値: `AUDICLE_DEFAULT_VOICE=ja-JP-Wavenet-B`
2. 各ランタイムでの読み取り順序（優先順位）:
   - 明示的なリクエストパラメータ（API 呼び出しで voice を渡す）
   - 拡張や web-app のローカル `config.json`（ユーザーが明示的に変更できる）
   - 環境変数 `AUDICLE_DEFAULT_VOICE`
   - アプリケーション内のハードコード（最終フォールバック）
3. 受け取った voice を検証するユーティリティを追加する（API 側）。検証内容例:
   - 空文字/未指定 → 環境変数 or デフォルトに置換
   - 許容リストチェック（allowlist）: `ja-JP-Wavenet-B`, `ja-JP-Standard-A`, ... のいずれか
   - 互換名のマッピング（例: `ja-JP-NanamiNeural` -> `ja-JP-Standard-A` など）を実装し、ログに変換理由を出力

## 具体的な実装手順（編集禁止: 本ドキュメント以外の編集はしない）

以下は実際に修正を行う際の手順です。必ず段階的に実行し、各ステップで動作確認を行ってください。

1. 環境変数名の決定

   - 決定: `AUDICLE_DEFAULT_VOICE`
   - 例: `export AUDICLE_DEFAULT_VOICE=ja-JP-Wavenet-B`

2. API サーバー側の変更（案）

   - 変更点（提案、実際の編集は別ブランチで行う）:
     - `packages/api-server/main.py` の default 値および受け取り処理を以下の順にする: リクエストの voice -> 環境変数 `AUDICLE_DEFAULT_VOICE` -> 現状デフォルト `ja-JP-Wavenet-B`
     - 受け取った voice を検証し、許容リストにない場合はエラー（400）を返すか、マッピングしてフォールバックする。
   - 検証手順:
     - `curl` で `voice` を指定して音声生成できるか確認。
     - ログに `Using voice:` と出力されることを確認。

3. Chrome 拡張側の変更（案）

   - 変更点（提案）:
     - `packages/chrome-extension/config.json` に `defaultVoice` を追加しておく。
     - `packages/chrome-extension/background.js` の `APIServerSynthesizer` でリクエスト body の `voice` を `config.defaultVoice || AUDICLE_DEFAULT_VOICE || existing fallback` の順で決定する。
   - 検証手順:
     - `config.json` を更新して拡張をリロード。段落を再生して音声が変わるか確認。

4. web-app 側の変更（案）

   - `packages/web-app/lib/api.ts` と `audioCache.ts` の既定値を環境変数読み取りに変更（`process.env.AUDICLE_DEFAULT_VOICE` をビルド時に埋め込むか、サーバーサイド経由で注入）。

5. ドキュメントとサンプルの更新

   - README、curl サンプル、docs 内の `ja-JP-NanamiNeural` などを `AUDICLE_DEFAULT_VOICE` を参照する旨に更新。

6. フォールバックと互換性対応
   - 既存の `ja-JP-NanamiNeural` を送ってしまうクライアントがある場合に備え、API 側で `nanami` 系を許容するか、明示的にマッピングを行う（変換ログを残す）。

## 検証手順（具体コマンド）

1. 環境変数を設定して API を起動（docker-compose の場合）:

```bash
export AUDICLE_DEFAULT_VOICE=ja-JP-Wavenet-B
cd packages/api-server
docker-compose up -d --build
```

2. API の単体テスト（curl）:

```bash
curl -X POST http://localhost:8000/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"こんにちは","voice":"ja-JP-Wavenet-B"}' --output test.mp3
```

3. 拡張からの動作確認:
   - `packages/chrome-extension/config.json` に `"defaultVoice": "ja-JP-Wavenet-B"` を追加
   - 拡張をリロードして、ブラウザ上で段落を再生。API サーバーログに `Using voice` が出力され、実音声が返ることを確認。

## ロールバック/トラブルシュート

- もし音声が生成されなくなった場合、最初に環境変数をクリアして（`unset AUDICLE_DEFAULT_VOICE`）ローカルの既定値に戻す。
- API が 400 を返す場合は、送信している `voice` 名が許容リストにない可能性が高い。ログと `packages/api-server/main.py` の allowlist/マッピング設定を確認する。
- CORS やポート不一致が原因で拡張から API に到達できない場合は、ブラウザの DevTools でエラーを確認し、`packages/api-server/main.py` の CORS 設定を一時的に緩めてデバッグする（本番では制限を戻す）。

## 変更提案の最小差分（例）

以下は実際に行うとよい最小差分のサンプルです。実ファイルを直接編集するのではなく、まずは別ブランチで patch を作成してテストしてください。

1. `packages/api-server/main.py` (pseudocode):

```python
import os

DEFAULT_VOICE = os.getenv('AUDICLE_DEFAULT_VOICE', 'ja-JP-Wavenet-B')

def get_voice_from_request(request_voice: Optional[str]) -> str:
	 # request_voice -> env -> DEFAULT
	 if request_voice:
		  # ここで allowlist とマッピングを行う
		  return map_or_validate(request_voice)
	 return DEFAULT_VOICE

```

2. `packages/chrome-extension/config.json`:

```json
{
  "synthesizerType": "api_server",
  "defaultVoice": "ja-JP-Standard-A"
}
```

3. `packages/chrome-extension/background.js` (pseudocode):

```javascript
const cfg = await loadConfig();
const voiceToUse =
  cfg.defaultVoice || process.env.AUDICLE_DEFAULT_VOICE || "ja-JP-Standard-A";

fetch("/synthesize", { body: JSON.stringify({ text, voice: voiceToUse }) });
```

## 次の推奨アクション

1. このドキュメントの内容を確認して合意を得る。
2. 別ブランチを切り、まずは API 側（`packages/api-server`）で `AUDICLE_DEFAULT_VOICE` の導入と受け取りロジックの追加を行う。
3. その後、拡張と web-app 側を順に config-driven に変更する。

以上。
