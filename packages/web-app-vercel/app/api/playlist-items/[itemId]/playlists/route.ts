import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
import type { Playlist } from '@/types/playlist'

export async function GET(
    request: Request,
    context: { params: Promise<{ itemId: string }> }
) {
    try {
        const { itemId } = await context.params
        const { userEmail, response } = await requireAuth()
        if (response) return response

        // プレイリストアイテムを取得
        const { data: item, error: itemError } = await supabase
            .from('playlist_items')
            .select('playlist_id')
            .eq('id', itemId)
            .single()

        if (itemError || !item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // プレイリストが存在し、ユーザーのものであることを確認
        const { data: playlists, error: playlistsError } = await supabase
            .from('playlists')
            .select('id, name, is_default')
            .eq('owner_email', userEmail)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

        if (playlistsError) {
            return NextResponse.json(
                { error: 'Failed to fetch playlists' },
                { status: 500 }
            )
        }

        return NextResponse.json(playlists as Playlist[])
    } catch (error) {
        console.error('Error in GET /api/playlist-items/[itemId]/playlists:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
