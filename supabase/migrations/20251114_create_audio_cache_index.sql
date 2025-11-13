-- 音声キャッシュインデックステーブル
CREATE TABLE audio_cache_index (
  article_url TEXT NOT NULL,
  voice TEXT NOT NULL,
  cached_chunks TEXT[] NOT NULL DEFAULT '{}',
  completed_playback BOOLEAN DEFAULT false,
  read_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (article_url, voice)
);

-- 高速検索用インデックス
CREATE INDEX idx_cache_lookup ON audio_cache_index(article_url, voice);
CREATE INDEX idx_last_accessed ON audio_cache_index(last_accessed);
CREATE INDEX idx_cached_chunks ON audio_cache_index USING GIN(cached_chunks);

-- チャンク追加RPC関数
CREATE OR REPLACE FUNCTION add_cached_chunk(
  p_article_url TEXT,
  p_voice TEXT,
  p_text_hash TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO audio_cache_index (article_url, voice, cached_chunks, read_count)
  VALUES (p_article_url, p_voice, ARRAY[p_text_hash], 1)
  ON CONFLICT (article_url, voice)
  DO UPDATE SET
    cached_chunks = CASE 
      WHEN p_text_hash = ANY(audio_cache_index.cached_chunks) THEN audio_cache_index.cached_chunks
      ELSE array_append(audio_cache_index.cached_chunks, p_text_hash)
    END,
    read_count = audio_cache_index.read_count + 1,
    last_accessed = NOW();
END;
$$ LANGUAGE plpgsql;

-- チャンク削除RPC関数
CREATE OR REPLACE FUNCTION remove_cached_chunk(
  p_article_url TEXT,
  p_voice TEXT,
  p_text_hash TEXT
) RETURNS void AS $$
BEGIN
  UPDATE audio_cache_index
  SET cached_chunks = array_remove(cached_chunks, p_text_hash),
      last_accessed = NOW()
  WHERE article_url = p_article_url AND voice = p_voice;
END;
$$ LANGUAGE plpgsql;

-- completedPlayback更新RPC関数
CREATE OR REPLACE FUNCTION update_completed_playback(
  p_article_url TEXT,
  p_voice TEXT,
  p_completed BOOLEAN
) RETURNS void AS $$
BEGIN
  UPDATE audio_cache_index
  SET completed_playback = p_completed,
      last_accessed = NOW()
  WHERE article_url = p_article_url AND voice = p_voice;
END;
$$ LANGUAGE plpgsql;
