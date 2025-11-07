import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET: デフォルトプレイリスト取得（なければ自動作成）
export async function GET() {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email

    // デフォルトプレイリストを検索
    const { data: fetchedPlaylist, error: fetchError } = await supabase
      .from('playlists')
      .select(`
        *,
        playlist_items(
          id,
          playlist_id,
          bookmark_id,
          position,
          added_at,
          bookmark:bookmarks(*)
        )
      `)
      .eq('owner_email', userEmail)
      .eq('is_default', true)
      .single()

    let playlist = fetchedPlaylist

    // デフォルトプレイリストが存在しない場合は作成
    if (fetchError && fetchError.code === 'PGRST116') {
      const { data: newPlaylist, error: createError } = await supabase
        .from('playlists')
        .insert({
          owner_email: userEmail,
          name: '読み込んだ記事',
          description: '読み込んだ記事が自動的に追加されます',
          visibility: 'private',
          is_default: true,
          allow_fork: true,
        })
        .select()
        .single()

      if (createError) {
        console.error('Supabase error (create):', createError)
        return NextResponse.json(
          { error: 'Failed to create default playlist' },
          { status: 500 }
        )
      }

      playlist = {
        ...newPlaylist,
        playlist_items: [],
      }
    } else if (fetchError) {
      console.error('Supabase error (fetch):', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch default playlist' },
        { status: 500 }
      )
    }

    // playlist_itemsをitemsにリネーム
    const items = playlist?.playlist_items || []
    
    return NextResponse.json({
      ...playlist,
      items,
      item_count: items.length,
      playlist_items: undefined,
    })
  } catch (error) {
    console.error('Error in GET /api/playlists/default:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
