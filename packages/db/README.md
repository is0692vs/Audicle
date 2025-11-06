# Audicle Database Schema

Supabaseを使用した共有データベース設計

## 接続情報

- URL: `NEXT_PUBLIC_SUPABASE_URL`
- Anon Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## テーブル

後続タスクで段階的に追加:

- タスク2: `user_settings`
- タスク2.5: `playlists`, `bookmarks`, `playlist_items`
- タスク5.2: `cache_metadata`
- タスク5.4: `article_stats`

## マイグレーション

`migrations/` ディレクトリにSQLファイルを配置
