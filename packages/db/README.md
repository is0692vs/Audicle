# Audicle Database Schema

Supabase を使用した共有データベース設計

## 接続情報

- URL: `NEXT_PUBLIC_SUPABASE_URL`
- Anon Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## テーブル

後続タスクで段階的に追加:

- タスク 2: `user_settings`
- タスク 2.5: `playlists`, `bookmarks`, `playlist_items`
- タスク 5.2: `cache_metadata`
- タスク 5.4: `article_stats`

## マイグレーション

`migrations/` ディレクトリに SQL ファイルを配置
