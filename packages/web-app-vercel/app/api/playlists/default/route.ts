import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
import { getOrCreateDefaultPlaylist } from '@/lib/playlist-utils'

// GET: デフォルトプレイリスト取得（なければ自動作成）
export async function GET() {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response

        // デフォルトプレイリストを取得（なければ作成）
        const defaultPlaylistResult = await getOrCreateDefaultPlaylist(userEmail!)
        if (defaultPlaylistResult.error) {
            return NextResponse.json(
                { error: defaultPlaylistResult.error },
                { status: 500 }
            )
        }

        const playlistId = defaultPlaylistResult.id

        // デフォルトプレイリストの詳細情報を取得
        const { data: playlist, error: fetchError } = await supabase
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
            .eq('id', playlistId)
            .order('position', { foreignTable: 'playlist_items', ascending: true })
            .single()

        if (fetchError) {
            console.error('Supabase error (fetch):', fetchError)
            return NextResponse.json(
                { error: 'Failed to fetch default playlist' },
                { status: 500 }
            )
        }

        // playlist_itemsをitemsにリネームし、不要なプロパティを削除
        const { playlist_items: items = [], ...playlistData } = playlist

        return NextResponse.json({
            ...playlistData,
            items,
            item_count: items.length,
        })
    } catch (error) {
        console.error('Error in GET /api/playlists/default:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
