import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

// DELETE: プレイリストからアイテムを削除
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response

        const { id: playlistId, itemId } = await params

        // プレイリストの所有権を確認
        const { data: playlist, error: playlistError } = await supabase
            .from('playlists')
            .select('owner_email')
            .eq('id', playlistId)
            .single()

        if (playlistError || !playlist) {
            console.error('Supabase error:', playlistError)
            return NextResponse.json(
                { error: playlistError.message || 'Playlist not found' },
                { status: 404 }
            )
        }

        if (playlist.owner_email !== userEmail) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            )
        }

        // playlist_itemsから削除
        const { error: deleteError } = await supabase
            .from('playlist_items')
            .delete()
            .eq('id', itemId)
            .eq('playlist_id', playlistId)
            .single()

        if (deleteError) {
            // PGRST116は「No rows found」エラーコード
            if (deleteError.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Item not found' },
                    { status: 404 }
                )
            }
            console.error('Supabase error:', deleteError)
            return NextResponse.json(
                { error: deleteError.message || 'Failed to delete item' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in DELETE /api/playlists/[id]/items/[itemId]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
