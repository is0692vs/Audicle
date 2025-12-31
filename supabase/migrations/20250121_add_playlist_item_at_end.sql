-- マイグレーション: プレイリストアイテムを末尾に追加するRPC関数
-- 目的: race conditionを防ぐため、position計算とinsertをアトミックに実行

-- 関数: add_playlist_item_at_end
-- プレイリストの末尾に新しいアイテムを追加する
-- 既存のアイテムが存在する場合はスキップ（既存position返却）
CREATE OR REPLACE FUNCTION add_playlist_item_at_end(
  p_playlist_id UUID,
  p_article_id UUID
)
RETURNS TABLE (
  position INTEGER,
  already_exists BOOLEAN
) AS $$
DECLARE
  v_existing_position INTEGER;
  v_max_position INTEGER;
  v_next_position INTEGER;
BEGIN
  -- 既存のアイテムをチェック
  SELECT pi.position INTO v_existing_position
  FROM playlist_items pi
  WHERE pi.playlist_id = p_playlist_id
    AND pi.article_id = p_article_id
  LIMIT 1;

  -- 既存のアイテムが見つかった場合は、そのpositionを返す
  IF v_existing_position IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_position, true;
    RETURN;
  END IF;

  -- 最大positionを取得（FOR UPDATE で排他ロック）
  SELECT COALESCE(MAX(pi.position), -1) INTO v_max_position
  FROM playlist_items pi
  WHERE pi.playlist_id = p_playlist_id
  FOR UPDATE;

  -- 次のpositionを計算
  v_next_position := v_max_position + 1;

  -- 新規挿入
  INSERT INTO playlist_items (playlist_id, article_id, position)
  VALUES (p_playlist_id, p_article_id, v_next_position);

  -- 新しいpositionを返す
  RETURN QUERY SELECT v_next_position, false;
END;
$$ LANGUAGE plpgsql;
