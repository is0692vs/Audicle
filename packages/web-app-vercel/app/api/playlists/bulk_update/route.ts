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

        // articleId が UUID か article_hash かを判定し、必要に応じて変換
        let actualArticleId = articleId;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) {
            // article_hash の場合、article_stats から URL を取得
            const { data: articleStat, error: statError } = await supabase
                .from('article_stats')
                .select('url')
                .eq('article_hash', articleId)
                .single()

            if (statError || !articleStat?.url) {
                return NextResponse.json(
                    { error: 'Article stats not found' },
                    { status: 404 }
                )
            }

            // URL から articles.id を取得
            const { data: article, error: lookupError } = await supabase
                .from('articles')
                .select('id')
                .eq('url', articleStat.url)
                .eq('owner_email', userEmail)
                .single()

            if (lookupError || !article) {
                return NextResponse.json(
                    { error: 'Article not found in user bookmarks' },
                    { status: 404 }
                )
            }

            actualArticleId = article.id;
        } else {
            // UUID の場合、所有権確認
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

        // バルク更新処理（個別操作）
        let addedCount = 0;
        let removedCount = 0;

        // 削除処理
        if (removeFromPlaylistIds.length > 0) {
            const { error: deleteError } = await supabase
                .from('playlist_items')
                .delete()
                .eq('article_id', actualArticleId)
                .in('playlist_id', removeFromPlaylistIds);

            if (deleteError) {
                console.error('Supabase delete error:', deleteError);
                return NextResponse.json(
                    { error: 'プレイリストからの削除に失敗しました' },
                    { status: 500 }
                );
            }
            removedCount = removeFromPlaylistIds.length;
        }

        // 追加処理
        if (addToPlaylistIds.length > 0) {
            const insertData = addToPlaylistIds.map(playlistId => ({
                playlist_id: playlistId,
                article_id: actualArticleId,
                added_at: new Date().toISOString(),
            }));

            const { error: insertError } = await supabase
                .from('playlist_items')
                .insert(insertData);

            if (insertError) {
                console.error('Supabase insert error:', insertError);
                return NextResponse.json(
                    { error: 'プレイリストへの追加に失敗しました' },
                    { status: 500 }
                );
            }
            addedCount = addToPlaylistIds.length;
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
        console.error('Error in POST /api/playlists/bulk_update:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
