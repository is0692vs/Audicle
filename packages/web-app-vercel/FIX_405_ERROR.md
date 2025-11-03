# 405 エラーの根本原因と修正内容

## 🔴 真の根本原因

**JSDOM が Vercel 環境で動作しない**

```
ERR_REQUIRE_ESM: jsdom 内の parse5 が ES Module のため、
Node.js の require() で読み込めない
```

Vercel のサーバーレス関数環境では ES Module 互換性の問題が発生するため、JSDOM が実行時エラーになります。

## ✅ 解決策

**JSDOM を `linkedom` に置き換え**

linkedom は軽量で Vercel Serverless Functions で正常に動作します。

### 1. **パッケージの置き換え**（最重要）

```json
// 削除
"jsdom": "^27.0.0",
"@types/jsdom": "^27.0.0",

// 追加
"linkedom": "^0.18.3",
```

### 2. **app/api/extract/route.ts の修正**

```typescript
// 変更前
import { JSDOM } from 'jsdom';
const dom = new JSDOM(html, { url });
const doc = dom.window.document;
const article = new Readability(doc).parse();

// 変更後
import { parseHTML } from 'linkedom';
const { document } = parseHTML(html);
const article = new Readability(document).parse();
```

### 3. **Readability.js の使い方は同じ**

```typescript
import { Readability } from '@mozilla/readability';
const reader = new Readability(document);
const article = reader.parse();
```

### 4. **next.config.ts を更新**

```typescript
serverExternalPackages: ['@mozilla/readability', 'linkedom', '@google-cloud/text-to-speech'],
```

## 修正済みファイル

1. ✅ `package.json`: jsdom → linkedom に置き換え
2. ✅ `app/api/extract/route.ts`: JSDOM → linkedom に置き換え
3. ✅ `next.config.ts`: serverExternalPackages を更新
4. ✅ `middleware.ts`: API Routes を明示的にスキップ（既に修正済み）
5. ✅ `vercel.json`: buildCommand を追加（既に修正済み）

## 修正ファイル

1. `package.json`: ビルドスクリプトから`--turbopack`を削除
2. `middleware.ts`: 標準的な middleware 関数に変更
3. `next.config.ts`: PWA runtimeCaching 設定を追加
4. `vercel.json`: buildCommand を追加

## 次のステップ

1. これらの修正をコミットしてプッシュ
2. Vercel が自動再デプロイ
3. 405 エラーが解消されることを確認
4. 必要に応じて、Vercel Dashboard > Settings > General で "Vercel Authentication" が無効になっていることを確認
