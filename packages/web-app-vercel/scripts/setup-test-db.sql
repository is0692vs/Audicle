-- テスト環境用スキーマ
-- 本番環境のテーブル構造を複製

-- UUID生成はPostgreSQL標準のgen_random_uuid()を使用

CREATE TABLE IF NOT EXISTS public.article_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_hash character varying(64) NOT NULL,
  user_id_hash character varying(64) NOT NULL,
  cache_hit_count integer DEFAULT 0,
  cache_miss_count integer DEFAULT 0,
  accessed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT article_access_log_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.article_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_hash character varying(64) NOT NULL UNIQUE,
  url text NOT NULL,
  title text NOT NULL,
  domain character varying(255) NOT NULL,
  access_count integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  cache_hit_rate numeric DEFAULT 0.00,
  is_fully_cached boolean DEFAULT false,
  first_accessed_at timestamp with time zone DEFAULT now(),
  last_accessed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT article_stats_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_email character varying(255) NOT NULL,
  url text NOT NULL UNIQUE,
  title text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  thumbnail_url text,
  last_read_position integer,
  CONSTRAINT articles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audio_cache_index (
  article_url text NOT NULL,
  voice text NOT NULL,
  cached_chunks text[] NOT NULL DEFAULT '{}'::text[],
  completed_playback boolean DEFAULT false,
  read_count integer DEFAULT 0,
  last_accessed timestamp with time zone DEFAULT now(),
  CONSTRAINT audio_cache_index_pkey PRIMARY KEY (article_url, voice)
);

CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_email character varying(255) NOT NULL,
  name character varying(255) NOT NULL,
  description text,
  visibility character varying DEFAULT 'private'::character varying CHECK (visibility::text = ANY (ARRAY['private'::character varying, 'shared'::character varying, 'collaborative'::character varying]::text[])),
  share_url character varying(255) UNIQUE,
  is_default boolean DEFAULT false,
  allow_fork boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT playlists_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS playlists_owner_default_true_unique
  ON public.playlists (owner_email)
  WHERE is_default = true;

CREATE TABLE IF NOT EXISTS public.playlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL,
  article_id uuid NOT NULL,
  position integer NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT playlist_items_pkey PRIMARY KEY (id),
  CONSTRAINT playlist_items_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE,
  CONSTRAINT playlist_items_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id text NOT NULL,
  playback_speed double precision DEFAULT 1.0,
  voice_model character varying(255) DEFAULT 'ja-JP-Standard-B'::character varying,
  language character varying(50) DEFAULT 'ja-JP'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  color_theme character varying(50) DEFAULT 'ocean'::character varying,
  CONSTRAINT user_settings_pkey PRIMARY KEY (user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_article_stats_article_hash ON public.article_stats(article_hash);
CREATE INDEX IF NOT EXISTS idx_articles_owner_email ON public.articles(owner_email);
CREATE INDEX IF NOT EXISTS idx_playlists_owner_email ON public.playlists(owner_email);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON public.playlist_items(playlist_id);

-- RPC function replicated from production
CREATE OR REPLACE FUNCTION public.increment_article_stats(
  p_article_hash character varying,
  p_url text,
  p_title text,
  p_domain character varying,
p_user_id_hash character varying,
p_cache_hits integer DEFAULT 0,
p_cache_misses integer DEFAULT 0,
p_is_fully_cached boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.article_stats (
    article_hash,
    url,
    title,
    domain,
    access_count,
    unique_users,
    cache_hit_rate,
    is_fully_cached,
    first_accessed_at,
    last_accessed_at
  )
  VALUES (
    p_article_hash,
    p_url,
    p_title,
    p_domain,
    1,
    1,
    CASE 
      WHEN (p_cache_hits + p_cache_misses) > 0 THEN p_cache_hits::numeric / (p_cache_hits + p_cache_misses)
      ELSE 0
    END,
    p_is_fully_cached,
    now(),
    now()
  )
  ON CONFLICT (article_hash) DO UPDATE SET
    access_count = article_stats.access_count + 1,
    cache_hit_rate = CASE 
      WHEN (p_cache_hits + p_cache_misses) > 0 THEN p_cache_hits::numeric / (p_cache_hits + p_cache_misses)
      ELSE article_stats.cache_hit_rate 
    END,
    is_fully_cached = p_is_fully_cached,
    last_accessed_at = now(),
    updated_at = now();

  INSERT INTO public.article_access_log (
    article_hash,
    user_id_hash,
    cache_hit_count,
    cache_miss_count
  )
  VALUES (
    p_article_hash,
    p_user_id_hash,
    p_cache_hits,
    p_cache_misses
  );
END;
$$;
// この関数は、記事のアクセス統計を更新するために使用されます。