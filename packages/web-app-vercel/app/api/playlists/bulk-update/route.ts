import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

interface BulkUpdateRequest {
    articleId: string
    addToPlaylistIds: string[]
    removeFromPlaylistIds: string[]
}

// POST: 複数プレイリストへの一括追加・削除
export async function POST(request: Request) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response

        const body: BulkUpdateRequest = await request.json()
        const { articleId, addToPlaylistIds, removeFromPlaylistIds } = body

        if (!articleId) {
            return NextResponse.json(
                { error: 'articleId is required' },
                { status: 400 }
            )
        }

        // addToPlaylistIds と removeFromPlaylistIds が配列であることを検証
        if (!Array.isArray(addToPlaylistIds) || !Array.isArray(removeFromPlaylistIds)) {
            return NextResponse.json(
                { error: 'addToPlaylistIds and removeFromPlaylistIds must be arrays' },
                { status: 400 }
            )
        }

        // 記事の所有者確認
        const { data: article, error: articleError } = await supabase
            .from('articles')
            .select('id')
            .eq('id', articleId)
            .eq('owner_email', userEmail)
            .single()

        if (articleError || !article) {
            return NextResponse.json(
                { error: 'Article not found' },
                { status: 404 }
            )
        }

        // プレイリストIDの所有者確認
        const allPlaylistIds = [...new Set([...addToPlaylistIds, ...removeFromPlaylistIds])];

        if (allPlaylistIds.length > 0) {
            const { count, error: playlistError } = await supabase
                .from('playlists')
                .select('id', { count: 'exact' })
                .in('id', allPlaylistIds)
                .eq('owner_email', userEmail);

            if (playlistError) {
                console.error('Supabase playlist check error:', playlistError);
                return NextResponse.json(
                    { error: 'Failed to verify playlists' },
                    { status: 500 }
                );
            }

            if (count !== allPlaylistIds.length) {
                return NextResponse.json(
                    { error: 'One or more playlist IDs are invalid or not owned by the user' },
                    { status: 403 } // Forbidden
                );
            }
        }

        // バルク更新API呼び出し（トランザクション保証）
        let addedCount = 0;
        let removedCount = 0;

        if (addToPlaylistIds.length > 0 || removeFromPlaylistIds.length > 0) {
            const { data, error } = await supabase.rpc('bulk_update_playlist_items', {
                article_id_param: articleId,
                add_playlist_ids: addToPlaylistIds,
                remove_playlist_ids: removeFromPlaylistIds
            })

            if (error) {
                console.error('Supabase RPC error:', error)
                return NextResponse.json(
                    { error: 'プレイリストの更新に失敗しました' },
                    { status: 500 }
                )
            }

            if (data) {
                addedCount = data.added_count ?? 0;
                removedCount = data.removed_count ?? 0;

                console.log("プレイリストを更新", {
                    articleId,
                    addedCount,
                    removedCount,
                });
            }
        }

        return NextResponse.json(
            {
                message: 'Bulk update completed',
                addedCount,
                removedCount,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error in POST /api/playlists/bulk-update:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
