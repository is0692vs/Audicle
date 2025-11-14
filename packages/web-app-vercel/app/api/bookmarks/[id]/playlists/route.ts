import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
import { fetchPlaylistsByItem } from '@/lib/playlist-queries'
import type { Playlist } from '@/types/playlist'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: bookmarkId } = await context.params
        const { userEmail, response } = await requireAuth()
        if (response) return response

        // bookmark_id を持つすべてのプレイリストを効率的に取得
        const { data: playlistsWithItems, error: playlistsError } =
            await fetchPlaylistsByItem({
                supabase,
                userEmail,
                itemId: bookmarkId,
                filterField: 'bookmark_id',
                includePositionSort: true
            })

        if (playlistsError) {
            console.error('Supabase error:', playlistsError)
            return NextResponse.json(
                { error: 'Failed to fetch playlists' },
                { status: 500 }
            )
        }

        // playlist_itemsプロパティを削除して返す
        const playlists = playlistsWithItems.map(({ playlist_items: _, ...rest }) => rest)

        return NextResponse.json(playlists as Playlist[])
    } catch (error) {
        console.error('Error in GET /api/bookmarks/[id]/playlists:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}