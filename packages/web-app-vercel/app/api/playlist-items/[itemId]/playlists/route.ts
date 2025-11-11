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

        // itemIdからbookmark_idを取得し、同時に所有権を確認
        const { data: itemData, error: itemError } = await supabase
            .from('playlist_items')
            .select('bookmark_id, playlists(owner_email)')
            .eq('id', itemId)
            .single()

        if (itemError || !itemData) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        const playlists_data = itemData.playlists as { owner_email: string } | { owner_email: string }[] | null

        if (!playlists_data || (Array.isArray(playlists_data) ? playlists_data[0]?.owner_email : playlists_data.owner_email) !== userEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { bookmark_id } = itemData

        // bookmark_id を持つプレイリストを inner join で取得
        const { data: playlists, error: playlistsError } = await supabase
            .from('playlists')
            .select('id, name, is_default, playlist_items!inner(bookmark_id)')
            .eq('owner_email', userEmail)
            .eq('playlist_items.bookmark_id', bookmark_id)
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
