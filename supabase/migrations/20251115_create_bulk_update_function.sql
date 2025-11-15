-- Create bulk_update_playlist_items function
CREATE OR REPLACE FUNCTION bulk_update_playlist_items(
    article_id_param UUID,
    add_playlist_ids UUID[],
    remove_playlist_ids UUID[]
)
RETURNS TABLE(added_count INTEGER, removed_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    removed_count_var INTEGER := 0;
    added_count_var INTEGER := 0;
    playlist_id UUID;
BEGIN
    -- Remove items from specified playlists
    IF array_length(remove_playlist_ids, 1) > 0 THEN
        DELETE FROM playlist_items
        WHERE article_id = article_id_param
        AND playlist_id = ANY(remove_playlist_ids);

        GET DIAGNOSTICS removed_count_var = ROW_COUNT;
    END IF;

    -- Add items to specified playlists (avoid duplicates)
    IF array_length(add_playlist_ids, 1) > 0 THEN
        WITH new_rows AS (
            INSERT INTO playlist_items (article_id, playlist_id)
            SELECT article_id_param, unnest(add_playlist_ids)
            ON CONFLICT (article_id, playlist_id) DO NOTHING
            RETURNING 1
        )
        SELECT count(*) INTO added_count_var FROM new_rows;
    END IF;

    RETURN QUERY SELECT added_count_var, removed_count_var;
END;
$$;