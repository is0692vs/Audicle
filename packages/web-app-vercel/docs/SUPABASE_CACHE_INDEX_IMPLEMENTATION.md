# Supabase による音声キャッシュインデックス管理の実装完了報告

## 実装日

2025 年 11 月 14 日

## 概要

Vercel Blob head()操作を完全に排除し、Simple Operations をゼロにするため、Supabase にキャッシュインデックスを構築しました。

## 実装内容

### 1. Supabase マイグレーションファイル ✅

**ファイルパス**: `supabase/migrations/20251114_create_audio_cache_index.sql`

- `audio_cache_index`テーブルを作成
- 高速検索用のインデックスを追加
- RPC 関数を実装:
  - `add_cached_chunk`: チャンク追加（重複チェック付き）
  - `remove_cached_chunk`: チャンク削除
  - `update_completed_playback`: 再生完了フラグ更新

### 2. TypeScript 型定義とユーティリティ ✅

**ファイルパス**: `packages/web-app-vercel/lib/db/cacheIndex.ts`

- `CacheIndex`型を定義
- Supabase クライアントヘルパー関数:
  - `getCacheIndex`: キャッシュインデックス取得
  - `addCachedChunk`: チャンク追加
  - `removeCachedChunk`: チャンク削除
  - `updateCompletedPlayback`: 再生完了フラグ更新
  - `isCachedInIndex`: チャンクがキャッシュ済みかチェック

**ファイルパス**: `packages/web-app-vercel/lib/textHash.ts`

- サーバーサイド用の MD5 ハッシュ生成関数
- クライアントサイド用の簡易ハッシュ関数（将来的に MD5 ライブラリへの置き換え推奨）

### 3. synthesize API の更新 ✅

**ファイルパス**: `packages/web-app-vercel/app/api/synthesize/route.ts`

**変更内容**:

1. Supabase インデックス取得処理を追加（人気記事の場合のみ）
2. キャッシュチェックロジックを更新:
   - 人気記事 + Supabase インデックスあり → インデックスでチェック、head()スキップ
   - それ以外 → 従来通り head()でチェック
3. TTS 生成後、Vercel Blob に保存後に Supabase インデックスへ追加

**最適化効果**:

- 人気記事（readCount >= 2 & completedPlayback = true）の場合、head()操作を完全にスキップ
- Simple Operations を大幅に削減

### 4. キャッシュ管理 API エンドポイント ✅

**ファイルパス**: `packages/web-app-vercel/app/api/cache/remove/route.ts`

- 404 エラー時に Supabase インデックスからチャンクを削除
- クライアントからテキストを受け取り、サーバー側でハッシュを計算

**ファイルパス**: `packages/web-app-vercel/app/api/cache/update-completed/route.ts`

- 記事の再生完了時に Supabase インデックスの`completed_playback`フラグを更新

### 5. usePlayback の 404 ハンドリング更新 ✅

**ファイルパス**: `packages/web-app-vercel/hooks/usePlayback.ts`

**変更内容**:

1. 404 エラー検出時、Supabase インデックスから該当チャンクを削除
2. 記事再生完了時、Supabase インデックスの`completed_playback`フラグを更新

## デプロイ後の手動作業

### Supabase マイグレーション実行

1. Supabase Dashboard → SQL Editor を開く
2. 以下のファイルの内容をコピー:
   ```
   supabase/migrations/20251114_create_audio_cache_index.sql
   ```
3. SQL Editor に貼り付け
4. "Run"ボタンをクリック

### 動作確認

1. 記事を 2 回以上完全再生し、人気記事状態にする
2. 再度同じ記事を再生し、ログで以下を確認:
   ```
   [Supabase Index] ⚡ Cache hit, skipping head()
   [Optimize] ⚡ Simple Operations saved: X head() calls skipped
   ```

## アーキテクチャ

### データフロー

```
┌─────────────────┐
│ synthesize API  │
└────────┬────────┘
         │
         ├─ 人気記事判定（readCount >= 2 & completedPlayback = true）
         │
         ├─ Yes → Supabaseインデックス取得
         │         │
         │         ├─ キャッシュヒット → head()スキップ ⚡
         │         │                    → Blob URL直接構築
         │         │
         │         └─ キャッシュミス → TTS生成
         │                            → Blob保存
         │                            → Supabaseインデックス追加
         │
         └─ No → 従来フロー（head()使用）
```

### 404 エラーハンドリング

```
┌──────────────┐
│ usePlayback  │
└──────┬───────┘
       │
       ├─ 404エラー検出
       │
       ├─ /api/cache/remove 呼び出し
       │  └─ Supabaseインデックスから削除
       │
       └─ audioCache.get(forceRegenerate: true)
          └─ 再生成 & Supabaseインデックス追加
```

## 完了条件チェックリスト

- ✅ Supabase マイグレーションファイルが作成されている
- ✅ `lib/db/cacheIndex.ts`が実装されている
- ✅ `app/api/synthesize/route.ts`が Supabase インデックスを参照している
- ✅ `app/api/cache/remove/route.ts`が実装されている
- ✅ `app/api/cache/update-completed/route.ts`が実装されている
- ✅ `hooks/usePlayback.ts`の 404 ハンドリングが Supabase インデックスを同期している
- ✅ TypeScript コンパイルエラーなし

## 期待される効果

### Simple Operations 削減

- 人気記事（readCount >= 2 & completedPlayback = true）の場合
- 全チャンクの head()操作をスキップ
- 100 チャンクの記事の場合、100 回の head()操作を削減

### コスト削減

- Vercel Blob Simple Operations 料金を大幅削減
- 人気記事が多いほど効果が高い

### パフォーマンス向上

- head()操作のネットワークレイテンシを排除
- 音声合成 API 呼び出しの高速化

## 今後の改善提案

1. **クライアントサイドハッシュの改善**

   - 現在は簡易ハッシュを使用
   - `js-md5`などのライブラリ導入を検討

2. **人気記事判定の閾値調整**

   - 現在: readCount >= 2
   - 本番環境では 5 以上を推奨

3. **キャッシュインデックスのクリーンアップ**

   - 古いエントリの自動削除
   - last_accessed ベースの LRU 削除

4. **モニタリング**
   - Simple Operations 削減率の追跡
   - Supabase クエリパフォーマンスの監視

## 関連ドキュメント

- [Vercel Blob Pricing](https://vercel.com/docs/storage/vercel-blob/usage-and-pricing)
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL Array Functions](https://www.postgresql.org/docs/current/functions-array.html)
