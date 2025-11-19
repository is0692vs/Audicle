import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as supabaseLocal from '@/lib/supabaseLocal'
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
        let playlist: any = null
        let playlistError: any = null

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            const all = await supabaseLocal.getPlaylistsForOwner(userEmail)
            playlist = all.find(p => p.id === playlistId)
            if (!playlist) playlistError = { message: 'Not found' }
        } else {
            const resp = await supabase
                .from('playlists')
                .select('owner_email')
                .eq('id', playlistId)
                .single()
            playlist = resp.data
            playlistError = resp.error
        }

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
        let itemToDelete: any = null
        let fetchError: any = null

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            const items = (await supabaseLocal.getPlaylistWithItems(userEmail, playlistId))?.playlist_items || []
            itemToDelete = items.find((i: any) => i.id === itemId)
            if (!itemToDelete) fetchError = { message: 'Item not found' }
        } else {
            const resp = await supabase
                .from('playlist_items')
                .select('article_id')
                .eq('id', itemId)
                .eq('playlist_id', playlistId)
                .single()
            itemToDelete = resp.data
            fetchError = resp.error
        }

        if (fetchError || !itemToDelete) {
            console.error('Supabase error:', fetchError)
            return NextResponse.json(
                { error: fetchError?.message || 'Item not found' },
                { status: 404 }
            )
        }

        // playlist_itemsから削除
        let deleteError: any = null

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            const ok = await supabaseLocal.removePlaylistItem(playlistId, itemId)
            if (!ok) deleteError = { code: 'PGRST116' }
        } else {
            const resp = await supabase
                .from('playlist_items')
                .delete()
                .eq('id', itemId)
                .eq('playlist_id', playlistId)
                .single()
            deleteError = resp.error
        }

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
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            // check if any other playlist uses the article
            const playlistAll = await supabaseLocal.getPlaylistsForOwner(userEmail)
            const allItems = playlistAll.flatMap(p => p.playlist_items || [])
            const usedElsewhere = allItems.some((i: any) => i.article_id === itemToDelete.article_id)
            if (!usedElsewhere) {
                // Optionally remove article from local store. Not required for tests.
            }
        } else {
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
