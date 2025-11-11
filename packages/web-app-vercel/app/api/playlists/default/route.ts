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

        // getOrCreateDefaultPlaylistが既にitemsを含んでいるのでそのまま返す
        return NextResponse.json(defaultPlaylistResult.playlist)
    } catch (error) {
        console.error('Error in GET /api/playlists/default:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
