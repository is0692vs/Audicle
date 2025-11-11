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

        // bookmarkIdから、ユーザーの全playlist_itemsを取得
        const { data: items, error: itemsError } = await supabase
            .from('playlist_items')
            .select('playlist_id')
            .eq('bookmark_id', bookmarkId)

        if (itemsError) {
            console.error('Supabase error:', itemsError)
            return NextResponse.json(
                { error: 'Failed to fetch playlist items' },
                { status: 500 }
            )
        }

        const playlistIds = items.map(item => item.playlist_id)

        // プレイリスト情報を取得
        const { data: playlists, error: playlistsError } = await supabase
            .from('playlists')
            .select('*')
            .in('id', playlistIds)
            .eq('owner_email', userEmail)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

        if (playlistsError) {
            console.error('Supabase error:', playlistsError)
            return NextResponse.json(
                { error: 'Failed to fetch playlists' },
                { status: 500 }
            )
        }

        return NextResponse.json(playlists as Playlist[])
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}