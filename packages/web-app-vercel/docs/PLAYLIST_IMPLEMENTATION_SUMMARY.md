# プレイリスト機能付きブックマーク管理 実装サマリー

## 実装日

2025-11-07

## 概要

読み込んだ記事リストをデバイス間で同期し、将来的にプレイリスト整理・共有機能を拡張できる基盤を構築しました。

## Phase 1: データベーススキーマ

### 作成したテーブル

1. **playlists** - プレイリスト管理

   - id (UUID, PRIMARY KEY)
   - owner_email (VARCHAR(255))
   - name (VARCHAR(255))
   - description (TEXT)
   - visibility (VARCHAR(20), DEFAULT 'private')
   - share_url (VARCHAR(50), UNIQUE)
   - is_default (BOOLEAN, DEFAULT false)
   - allow_fork (BOOLEAN, DEFAULT true)
   - created_at, updated_at (TIMESTAMP)

2. **bookmarks** - ブックマーク管理

   - id (UUID, PRIMARY KEY)
   - owner_email (VARCHAR(255))
   - article_url (TEXT)
   - article_title (TEXT)
   - thumbnail_url (TEXT)
   - last_read_position (INTEGER)
   - created_at, updated_at (TIMESTAMP)
   - UNIQUE(owner_email, article_url)

3. **playlist_items** - プレイリスト-ブックマーク関連
   - id (UUID, PRIMARY KEY)
   - playlist_id (UUID, REFERENCES playlists)
   - bookmark_id (UUID, REFERENCES bookmarks)
   - position (INTEGER)
   - added_at (TIMESTAMP)
   - UNIQUE(playlist_id, bookmark_id)

### インデックス

- idx_playlists_owner
- idx_playlists_default
- idx_bookmarks_owner
- idx_playlist_items_playlist

### トリガー

- updated_at 自動更新 (playlists, bookmarks)

## Phase 2: 型定義

**ファイル**: `types/playlist.ts`

- Playlist
- Bookmark
- PlaylistItem
- PlaylistWithItems

## Phase 3: API 実装

### 実装したエンドポイント

1. **GET /api/playlists** - プレイリスト一覧取得
2. **POST /api/playlists** - プレイリスト作成
3. **GET /api/playlists/[id]** - プレイリスト詳細取得（ブックマーク含む）
4. **PATCH /api/playlists/[id]** - プレイリスト更新
5. **DELETE /api/playlists/[id]** - プレイリスト削除（デフォルトは削除不可）
6. **GET /api/playlists/default** - デフォルトプレイリスト取得（自動作成）
7. **POST /api/bookmarks** - ブックマーク追加（デフォルトプレイリストに自動関連付け）
8. **DELETE /api/bookmarks/[id]** - ブックマーク削除
9. **PATCH /api/bookmarks/[id]** - 最後に読んだ位置の更新

### 認証

- 全 API で`auth()`による認証チェック
- ユーザーの email でデータを分離

## Phase 4: フロントエンド実装

### 修正したページ

1. **app/page.tsx** - トップページ

   - localStorage → Supabase 連携に変更
   - `/api/playlists/default`からデフォルトプレイリストを取得
   - 「プレイリスト」リンク追加
   - ブックマーク削除を Supabase 連携に変更

2. **app/reader/ReaderClient.tsx** - 記事読み込み
   - 記事読み込み時に自動的にブックマーク追加
   - `/api/bookmarks`へ POST
   - ローカルストレージとの後方互換性を維持

### 新規作成したページ

1. **app/playlists/page.tsx** - プレイリスト一覧

   - プレイリスト一覧表示
   - 新規作成フォーム
   - プレイリスト削除（デフォルト以外）

2. **app/playlists/[id]/page.tsx** - プレイリスト詳細
   - プレイリスト情報表示・編集
   - ブックマーク一覧表示
   - ブックマーク削除

## Phase 5: デフォルトプレイリスト

### 自動作成の仕組み

- 初回ログイン時、`/api/playlists/default`へのアクセスで自動作成
- 名前: "読み込んだ記事"
- 説明: "読み込んだ記事が自動的に追加されます"
- is_default: true

## 完了条件チェックリスト

- [x] Supabase で 3 テーブル作成完了
- [x] 型定義ファイル作成
- [x] 5 つの API 実装（プレイリスト CRUD、ブックマーク追加・削除）
- [x] トップページでデフォルトプレイリスト表示
- [x] 記事読み込み時に自動でブックマーク追加
- [x] プレイリスト管理画面（基本 UI）
- [x] TypeScript 型チェック成功
- [x] デバイス間で読み込みリストが同期される（実装完了）

## 今回実装したこと

- デフォルトプレイリスト（読み込みリスト）
- visibility='private'のみ使用
- 基本的な CRUD 操作
- デバイス間同期の基盤

## 今回実装しなかったこと（将来用に DB カラムは用意済み）

- visibility='shared'/'collaborative'の機能
- share_url の生成・共有機能
- playlist_collaborators テーブル
- プレイリスト間のドラッグ&ドロップ
- Fork 機能

## 技術スタック

- **バックエンド**: Next.js App Router, Supabase PostgreSQL
- **認証**: NextAuth.js
- **フロントエンド**: React, TypeScript, Tailwind CSS
- **状態管理**: React Hooks (useState, useEffect, useCallback)

## ファイル構成

```
packages/
  db/
    migrations/
      002_create_playlist_tables.sql
  web-app-vercel/
    app/
      api/
        bookmarks/
          [id]/route.ts
          route.ts
        playlists/
          [id]/route.ts
          default/route.ts
          route.ts
      playlists/
        [id]/page.tsx
        page.tsx
      page.tsx
      reader/
        ReaderClient.tsx
    types/
      playlist.ts
```

## 注意事項

### エラーハンドリング

- 簡易的な実装（基本的なエラーメッセージ返却）
- console.error でログ出力
- フロントエンドで logger 使用

### データ移行

- 既存の localStorage データはそのまま残る
- 新規記事追加時は Supabase と localStorage 両方に保存
- 段階的な移行をサポート

## 次のステップ（将来実装予定）

1. プレイリスト共有機能（share_url 生成）
2. 他のユーザーとのコラボレーション機能
3. プレイリストの Fork 機能
4. ドラッグ&ドロップでのブックマーク整理
5. サムネイル画像の自動取得
6. 読書進捗の詳細管理
