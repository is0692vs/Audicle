import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
import type { Playlist } from '@/types/playlist'

// GET: ブックマークが含まれるプレイリスト一覧取得
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response

        const { id: bookmarkId } = await params

        // ブックマークの所有者確認
        const { data: bookmark, error: bookmarkError } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('id', bookmarkId)
            .eq('owner_email', userEmail)
            .single()

        if (bookmarkError || !bookmark) {
            return NextResponse.json(
                { error: 'Bookmark not found' },
                { status: 404 }
            )
        }

        // ブックマークが含まれるプレイリスト一覧を取得
        const { data: playlists, error } = await supabase
            .from('playlists')
            .select(`
        *,
        playlist_items!inner(bookmark_id)
      `)
            .eq('owner_email', userEmail)
            .eq('playlist_items.bookmark_id', bookmarkId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch playlists' },
                { status: 500 }
            )
        }

        // playlist_itemsを削除してクリーンアップ
        const cleanedPlaylists = playlists?.map((p) => {
            const { playlist_items, ...rest } = p
            return rest as Playlist
        }) || []

        return NextResponse.json(cleanedPlaylists)
    } catch (error) {
        console.error('Error in GET /api/bookmarks/[id]/playlists:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
