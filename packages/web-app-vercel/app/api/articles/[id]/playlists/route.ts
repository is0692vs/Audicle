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

        // article_id を持つプレイリストアイテムを取得し、そこからプレイリストを取得
        const { data: playlistItems, error: playlistItemsError } = await supabase
            .from('playlist_items')
            .select(`
                playlist_id,
                playlists (
                    id,
                    name,
                    description,
                    owner_email,
                    is_default,
                    position,
                    created_at,
                    updated_at
                )
            `)
            .eq('article_id', articleId)

        if (playlistItemsError) {
            console.error('Supabase error:', playlistItemsError)
            return NextResponse.json(
                { error: 'Failed to fetch playlists' },
                { status: 500 }
            )
        }

        // プレイリストを抽出し、所有権でフィルタリング、ソート
        const playlists = (playlistItems || [])
            .map(item => item.playlists as any) // Type assertion to bypass TypeScript issue
            .filter((playlist): playlist is NonNullable<typeof playlist> => 
                playlist !== null && 
                typeof playlist === 'object' && 
                'owner_email' in playlist && 
                playlist.owner_email === userEmail
            )
            .sort((a, b) => {
                // position -> is_default (desc) -> created_at (desc) の順でソート
                if (a.position !== b.position) {
                    return (a.position ?? 0) - (b.position ?? 0)
                }
                if (a.is_default !== b.is_default) {
                    return a.is_default ? -1 : 1
                }
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })

        return NextResponse.json(playlists as Playlist[])
    } catch (error) {
        console.error('Error in GET /api/articles/[id]/playlists:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
