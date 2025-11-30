-- テスト環境用スキーマ
-- 本番環境のテーブル構造を複製

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.article_access_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  article_hash character varying NOT NULL,
  user_id_hash character varying NOT NULL,
  cache_hit_count integer DEFAULT 0,
  cache_miss_count integer DEFAULT 0,
  accessed_at timestamp without time zone DEFAULT now(),
  CONSTRAINT article_access_log_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.article_stats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  article_hash character varying NOT NULL UNIQUE,
  url text NOT NULL,
  title text NOT NULL,
  domain character varying NOT NULL,
  access_count integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  cache_hit_rate numeric DEFAULT 0.00,
  is_fully_cached boolean DEFAULT false,
  first_accessed_at timestamp without time zone DEFAULT now(),
  last_accessed_at timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT article_stats_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_email character varying NOT NULL,
  url text NOT NULL,
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
  owner_email character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  visibility character varying DEFAULT 'private'::character varying CHECK (visibility::text = ANY (ARRAY['private'::character varying, 'shared'::character varying, 'collaborative'::character varying]::text[])),
  share_url character varying UNIQUE,
  is_default boolean DEFAULT false,
  allow_fork boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT playlists_pkey PRIMARY KEY (id)
);

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
  voice_model character varying DEFAULT 'ja-JP-Standard-B'::character varying,
  language character varying DEFAULT 'ja-JP'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  color_theme character varying DEFAULT 'ocean'::character varying,
  CONSTRAINT user_settings_pkey PRIMARY KEY (user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_article_stats_article_hash ON public.article_stats(article_hash);
CREATE INDEX IF NOT EXISTS idx_articles_owner_email ON public.articles(owner_email);
CREATE INDEX IF NOT EXISTS idx_playlists_owner_email ON public.playlists(owner_email);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON public.playlist_items(playlist_id);
