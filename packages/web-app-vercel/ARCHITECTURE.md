# web-app-vercel アーキテクチャ

## 概要

`web-app-vercel`は、Vercelにデプロイするための**完全サーバーレス**構成のNext.js 15アプリケーションです。
外部APIサーバー（FastAPI）に依存せず、Next.js API Routesで全ての機能を提供します。

## web-app との違い

| 項目 | web-app（セルフホスト版） | web-app-vercel（Vercel版） |
|------|--------------------------|---------------------------|
| アーキテクチャ | クライアント + 外部APIサーバー（FastAPI） | サーバーレス（Next.js API Routes） |
| 記事抽出API | `http://localhost:8000/extract` | `/api/extract` |
| 音声合成API | `http://localhost:8000/synthesize` | `/api/synthesize` |
| CORS | 必要 | 不要（同一オリジン） |
| デプロイ | 自前サーバー、Docker | Vercel（サーバーレス） |
| 環境変数 | `API_BASE_URL` | 不要 |

## API Routesの実装

### `/api/extract` - 記事抽出

**ファイル**: `app/api/extract/route.ts`

```typescript
export const runtime = 'nodejs'; // JSDOMはEdge Runtimeで動作しない
export const dynamic = 'force-dynamic'; // キャッシュを無効化

export async function POST(request: NextRequest) {
  // 1. URLを受け取る
  // 2. HTMLを取得
  // 3. JSDOMでパース
  // 4. Readabilityで本文抽出
  // 5. レスポンスを返す
}
```

**依存パッケージ**:
- `@mozilla/readability`: 本文抽出
- `jsdom`: HTML解析

**重要**: Node.js Runtimeが必須（Edge Runtimeでは動作しない）

### `/api/synthesize` - 音声合成

**ファイル**: `app/api/synthesize/route.ts`

```typescript
export const runtime = 'nodejs'; // Google Cloud TTS SDKはEdge Runtimeで動作しない
export const dynamic = 'force-dynamic'; // キャッシュを無効化

export async function POST(request: NextRequest) {
  // 1. 認証チェック（NextAuth）
  // 2. テキストを受け取る
  // 3. Google Cloud TTS APIで音声合成
  // 4. base64エンコードして返す
}
```

**依存パッケージ**:
- `@google-cloud/text-to-speech`: Google Cloud TTS SDK
- `next-auth`: 認証

**重要**: Node.js Runtimeが必須（Edge Runtimeでは動作しない）

**環境変数**:
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: サービスアカウントの認証情報（JSON文字列）
- `ALLOWED_EMAILS`: 許可するユーザーのメールアドレス（カンマ区切り）

## クライアント側の実装

### `lib/api.ts`

```typescript
// 外部APIサーバーではなく、内部API Routeを呼び出す
export async function extractContent(url: string): Promise<ExtractResponse> {
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return response.json();
}

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const response = await fetch("/api/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await response.json();
  // base64デコードしてBlobに変換
  const audioData = atob(data.audio);
  const bytes = new Uint8Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    bytes[i] = audioData.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'audio/mpeg' });
}
```

**重要**: 
- `API_BASE_URL`などの環境変数は不要
- 相対パス（`/api/extract`, `/api/synthesize`）を使用
- 同一オリジンのため、CORSの問題なし

## Vercel設定

### `vercel.json`

```json
{
  "functions": {
    "app/api/extract/route.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 10
    },
    "app/api/synthesize/route.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 10
    }
  }
}
```

**重要**: Node.js 20.xランタイムを明示的に指定することで、Edge Runtimeのデフォルト使用を防ぐ

### `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@mozilla/readability', 
    'jsdom', 
    '@google-cloud/text-to-speech'
  ],
};
```

**重要**: Node.js専用パッケージをバンドルから除外

## 認証

### NextAuth 5.0

`/api/synthesize`エンドポイントは認証が必要です。

**環境変数**:
- `GOOGLE_CLIENT_ID`: Google OAuth クライアントID
- `GOOGLE_CLIENT_SECRET`: Google OAuth クライアントシークレット
- `ALLOWED_USERS`: 許可するユーザーのメールアドレス（カンマ区切り）
- `AUTH_SECRET`: NextAuth シークレット

**ミドルウェア**: `middleware.ts`
```typescript
export const config = {
  matcher: ['/((?!api|auth|_next/static|_next/image|favicon.ico).*)'],
};
```

APIルート（`/api/*`）は認証チェックをスキップします。
`/api/synthesize`内で個別に認証チェックを実施します。

## トラブルシューティング

### 405 Method Not Allowed エラー

**原因**:
1. Edge Runtimeがデフォルトで使用されている
2. JSDOMやGoogle Cloud TTS SDKがEdge Runtimeで動作しない

**解決策**:
1. `export const runtime = 'nodejs';`を追加
2. `vercel.json`でNode.js runtimeを明示的に指定
3. `serverExternalPackages`を設定

### ビルドエラー

**原因**: パッケージの互換性問題

**解決策**:
```bash
# キャッシュをクリア
rm -rf .next node_modules/.cache
npm install
npm run build
```

### 環境変数が読み込まれない

**Vercelダッシュボードで設定**:
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ALLOWED_USERS`
- `ALLOWED_EMAILS`
- `AUTH_SECRET`

**重要**: 設定後は必ず再デプロイが必要

## デプロイ

### 1. Vercelプロジェクト作成

```bash
# Vercel CLIをインストール
npm i -g vercel

# プロジェクトをVercelにリンク
cd packages/web-app-vercel
vercel link
```

### 2. 環境変数設定

Vercelダッシュボード > Settings > Environment Variables で設定

### 3. デプロイ

```bash
# プレビューデプロイ
vercel

# 本番デプロイ
vercel --prod
```

または、GitHubにプッシュすると自動デプロイされます。

## まとめ

- **完全サーバーレス**: 外部APIサーバー不要
- **Node.js Runtime必須**: Edge Runtimeでは動作しない
- **認証統合**: NextAuth 5.0で実装
- **環境変数**: Vercelダッシュボードで設定
- **自動デプロイ**: GitHubプッシュで自動デプロイ
