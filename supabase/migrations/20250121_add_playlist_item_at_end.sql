CREATE OR REPLACE FUNCTION add_playlist_item_at_end(
  p_playlist_id UUID,
  p_article_id UUID
)
RETURNS TABLE (
  item_position INTEGER,
  already_exists BOOLEAN
) AS $$
DECLARE
  v_existing_position INTEGER;
  v_max_position INTEGER;
  v_next_position INTEGER;
BEGIN
  SELECT pi.position INTO v_existing_position
  FROM playlist_items pi
  WHERE pi.playlist_id = p_playlist_id
    AND pi.article_id = p_article_id
  LIMIT 1;

  IF v_existing_position IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_position, true;
    RETURN;
  END IF;

  SELECT COALESCE(MAX(pi.position), -1) INTO v_max_position
  FROM playlist_items pi
  WHERE pi.playlist_id = p_playlist_id
  FOR UPDATE;

  v_next_position := v_max_position + 1;

  INSERT INTO playlist_items (playlist_id, article_id, position)
  VALUES (p_playlist_id, p_article_id, v_next_position);

  RETURN QUERY SELECT v_next_position, false;
END;
$$ LANGUAGE plpgsql;