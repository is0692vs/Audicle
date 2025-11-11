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

        // 削除前に、この記事が他のプレイリストにも存在するか確認するためarticle_idを取得
        const { data: itemToDelete, error: fetchError } = await supabase
            .from('playlist_items')
            .select('article_id')
            .eq('id', itemId)
            .eq('playlist_id', playlistId)
            .single()

        if (fetchError || !itemToDelete) {
            console.error('Supabase error:', fetchError)
            return NextResponse.json(
                { error: fetchError?.message || 'Item not found' },
                { status: 404 }
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

        // この記事が他のプレイリストに存在しないか確認
        const { count, error: checkError } = await supabase
            .from('playlist_items')
            .select('*', { count: 'exact', head: true })
            .eq('article_id', itemToDelete.article_id)

        // 他のプレイリストに存在しない場合、articlesからも削除
        if (!checkError && count === 0) {
            const { error: articleDeleteError } = await supabase
                .from('articles')
                .delete()
                .eq('id', itemToDelete.article_id)

            if (articleDeleteError) {
                console.error('Failed to delete article:', articleDeleteError)
                // 記事削除の失敗は致命的ではないので、エラーを返さない
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in DELETE /api/playlists/[id]/items/[itemId]:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
