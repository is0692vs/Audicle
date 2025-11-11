import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
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
        const { data: playlistsWithItems, error: playlistsError } = await supabase
            .from('playlists')
            .select('*, playlist_items!inner(bookmark_id)')
            .eq('owner_email', userEmail)
            .eq('playlist_items.bookmark_id', bookmarkId)
            .order('position', { ascending: true }) // ユーザー設定可能な順序を考慮
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

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