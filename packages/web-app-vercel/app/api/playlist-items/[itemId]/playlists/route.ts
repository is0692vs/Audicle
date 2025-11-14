import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
import { fetchPlaylistsByItem } from '@/lib/playlist-queries'
import type { Playlist } from '@/types/playlist'

export async function GET(
    request: Request,
    context: { params: Promise<{ itemId: string }> }
) {
    try {
        const { itemId } = await context.params
        const { userEmail, response } = await requireAuth()
        if (response) return response

        // itemIdからarticle_idを取得し、同時に所有権を確認
        const { data: itemData, error: itemError } = await supabase
            .from('playlist_items')
            .select('article_id, playlist_id')
            .eq('id', itemId)
            .single()

        if (itemError || !itemData) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // playlist_idから所有権を確認
        const { data: playlistData, error: playlistError } = await supabase
            .from('playlists')
            .select('owner_email')
            .eq('id', itemData.playlist_id)
            .single()

        if (playlistError || !playlistData || playlistData.owner_email !== userEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { article_id } = itemData

        // article_id を持つすべてのプレイリストを効率的に取得
        const { playlistsWithItems, playlistsError } =
            await fetchPlaylistsByItem({
                supabase,
                userEmail,
                itemId: article_id,
                filterField: 'article_id',
                includePositionSort: false
            });

        if (playlistsError) {
            return NextResponse.json(
                { error: playlistsError.message || 'Failed to fetch playlists' },
                { status: 500 }
            )
        }

        // playlist_itemsプロパティを削除して返す
        const playlists = playlistsWithItems!.map(({ playlist_items: _, ...rest }) => rest)

        return NextResponse.json(playlists as Playlist[])
    } catch (error) {
        console.error('Error in GET /api/playlist-items/[itemId]/playlists:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
