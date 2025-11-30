-- Fix articles table constraint for upsert operations
-- The API expects a composite unique constraint on (owner_email, url)
-- but the current table only has UNIQUE on url alone

-- First, drop the existing unique constraint on url if it exists
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_url_key;

-- Add the composite unique constraint that the API expects
ALTER TABLE public.articles ADD CONSTRAINT articles_owner_email_url_key UNIQUE (owner_email, url);

-- Also ensure playlist_items has the correct composite unique constraint
ALTER TABLE public.playlist_items DROP CONSTRAINT IF EXISTS playlist_items_playlist_id_article_id_key;
ALTER TABLE public.playlist_items ADD CONSTRAINT playlist_items_playlist_id_article_id_key UNIQUE (playlist_id, article_id);
