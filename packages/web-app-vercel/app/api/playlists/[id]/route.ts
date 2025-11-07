import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET: プレイリスト詳細取得（ブックマーク含む）
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()

        if (!session || !session.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userEmail = session.user.email
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
            item_count: items.length ?? 0,
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
        const session = await auth()

        if (!session || !session.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userEmail = session.user.email
        const { id } = await params
        const body = await request.json()

        const { name, description } = body

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
        const session = await auth()

        if (!session || !session.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userEmail = session.user.email
        const { id } = await params

        // デフォルトプレイリストは削除不可（1つのクエリでチェックと削除）
        const { error } = await supabase
            .from('playlists')
            .delete()
            .eq('id', id)
            .eq('owner_email', userEmail)
            .neq('is_default', true)

        if (error) {
            console.error('Supabase error:', error)
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Cannot delete default playlist' },
                    { status: 400 }
                )
            }
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
