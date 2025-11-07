-- Phase 1: プレイリスト機能付きブックマーク管理
-- タスク2.5: データベーススキーマ作成

-- 1. プレイリストテーブル
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'collaborative')),
  share_url VARCHAR(50) UNIQUE,
  is_default BOOLEAN DEFAULT false,
  allow_fork BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ブックマークテーブル
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email VARCHAR(255) NOT NULL,
  article_url TEXT NOT NULL,
  article_title TEXT NOT NULL,
  thumbnail_url TEXT,
  last_read_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_email, article_url)
);

-- 3. プレイリスト-ブックマーク関連テーブル
CREATE TABLE playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  bookmark_id UUID NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, bookmark_id)
);

-- 4. インデックス
CREATE INDEX idx_playlists_owner ON playlists(owner_email);
CREATE INDEX idx_playlists_owner_is_default ON playlists(owner_email, is_default);
CREATE INDEX idx_bookmarks_owner ON bookmarks(owner_email);
CREATE INDEX idx_playlist_items_playlist ON playlist_items(playlist_id);

-- 5. updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_playlists_updated_at 
  BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookmarks_updated_at 
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. プレイリストアイテム追加時のposition自動採番トリガー
CREATE OR REPLACE FUNCTION set_playlist_item_position()
RETURNS TRIGGER AS $$
BEGIN
  -- 親プレイリストの行をロックして、このプレイリストへの挿入をシリアライズする
  PERFORM 1 FROM playlists WHERE id = NEW.playlist_id FOR UPDATE;

  -- トランザクション内で安全に次のpositionを計算して設定
  NEW.position = (
    SELECT COALESCE(MAX(position), -1) + 1
    FROM playlist_items
    WHERE playlist_id = NEW.playlist_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_playlist_item_position
  BEFORE INSERT ON playlist_items
  FOR EACH ROW
  EXECUTE FUNCTION set_playlist_item_position();

-- 7. デフォルトプレイリスト作成時のユニーク制約
CREATE UNIQUE INDEX idx_playlists_default_per_user 
  ON playlists(owner_email) 
  WHERE is_default = true;
