import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

// GET: プレイリスト詳細取得（ブックマーク含む）
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response
        const { id } = await params

        // プレイリスト情報とアイテムを1つのクエリで取得
        const { data: playlist, error: playlistError } = await supabase
            .from('playlists')
            .select(`
        *,
        playlist_items(
          id,
          playlist_id,
          bookmark_id,
          position,
          added_at,
          bookmark:bookmarks(*)
        )
      `)
            .eq('id', id)
            .eq('owner_email', userEmail)
            .order('position', { foreignTable: 'playlist_items', ascending: true })
            .single()

        if (playlistError) {
            console.error('Supabase error:', playlistError)
            return NextResponse.json(
                { error: 'Playlist not found' },
                { status: 404 }
            )
        }

        // playlist_itemsをitemsにリネーム
        const { playlist_items: items = [], ...playlistData } = playlist

        return NextResponse.json({
            ...playlistData,
            items,
            item_count: items.length,
        })
    } catch (error) {
        console.error('Error in GET /api/playlists/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH: プレイリスト更新
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response
        const { id } = await params
        const body = await request.json()

        const { name, description } = body

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('playlists')
            .update({
                name,
                description,
            })
            .eq('id', id)
            .eq('owner_email', userEmail)
            .select()
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Playlist not found or permission denied' },
                    { status: 404 }
                )
            }
            console.error('Supabase error:', error)
            return NextResponse.json(
                { error: 'Failed to update playlist' },
                { status: 500 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error in PATCH /api/playlists/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE: プレイリスト削除
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response
        const { id } = await params

        // デフォルトプレイリストかどうかを確認
        const { data: playlistToDelete, error: fetchError } = await supabase
            .from('playlists')
            .select('is_default')
            .eq('id', id)
            .eq('owner_email', userEmail)
            .single()

        if (fetchError || !playlistToDelete) {
            console.error('Supabase error:', fetchError)
            return NextResponse.json(
                { error: 'Playlist not found' },
                { status: 404 }
            )
        }

        if (playlistToDelete.is_default) {
            return NextResponse.json(
                { error: 'Cannot delete default playlist' },
                { status: 400 }
            )
        }

        // デフォルト以外のプレイリストを削除
        const { error } = await supabase
            .from('playlists')
            .delete()
            .eq('id', id)
            .eq('owner_email', userEmail)

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json(
                { error: 'Failed to delete playlist' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Playlist deleted' })
    } catch (error) {
        console.error('Error in DELETE /api/playlists/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
