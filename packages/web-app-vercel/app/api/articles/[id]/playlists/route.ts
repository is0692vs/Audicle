import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
import type { Playlist } from '@/types/playlist'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: articleId } = await context.params
        const { userEmail, response } = await requireAuth()
        if (response) return response

        // article_id を持つプレイリストアイテムを取得
        const { data: playlistItems, error: playlistItemsError } = await supabase
            .from('playlist_items')
            .select('playlist_id')
            .eq('article_id', articleId)

        if (playlistItemsError) {
            console.error('Supabase error:', playlistItemsError)
            return NextResponse.json(
                { error: 'Failed to fetch playlists' },
                { status: 500 }
            )
        }

        if (!playlistItems || playlistItems.length === 0) {
            return NextResponse.json([])
        }

        // プレイリストIDのリストを取得
        const playlistIds = playlistItems.map(item => item.playlist_id)

        // プレイリストを取得（所有権フィルタリング付き）
        const { data: playlists, error: playlistsError } = await supabase
            .from('playlists')
            .select('*')
            .eq('owner_email', userEmail)
            .in('id', playlistIds)
            .order('position', { ascending: true })
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
        console.error('Error in GET /api/articles/[id]/playlists:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
