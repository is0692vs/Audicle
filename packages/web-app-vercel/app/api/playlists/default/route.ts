import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getOrCreateDefaultPlaylist } from '@/lib/playlist-utils'

// GET: デフォルトプレイリスト取得（なければ自動作成）
export async function GET() {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response

        // デフォルトプレイリストを取得（なければ作成）
        const defaultPlaylistResult = await getOrCreateDefaultPlaylist(userEmail!)
        if (defaultPlaylistResult.error || !defaultPlaylistResult.playlist) {
            return NextResponse.json(
                { error: defaultPlaylistResult.error || 'Failed to get default playlist' },
                { status: 500 }
            )
        }

        const playlist = defaultPlaylistResult.playlist

        // 既存のplaylist_itemsデータが含まれていない場合は、追加の取得が必要
        if (!('playlist_items' in playlist)) {
            // playlist_itemsをitemsにリネームして返す
            return NextResponse.json({
                ...playlist,
                items: [],
                item_count: 0,
            })
        }

        // playlist_itemsをitemsにリネーム
        const { playlist_items: items = [], ...playlistData } = playlist as Record<string, unknown>

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
