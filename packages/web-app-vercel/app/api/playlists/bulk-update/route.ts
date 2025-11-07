import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

interface BulkUpdateRequest {
    bookmarkId: string
    addToPlaylistIds: string[]
    removeFromPlaylistIds: string[]
}

// POST: 複数プレイリストへの一括追加・削除
export async function POST(request: Request) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response

        const body: BulkUpdateRequest = await request.json()
        const { bookmarkId, addToPlaylistIds, removeFromPlaylistIds } = body

        if (!bookmarkId) {
            return NextResponse.json(
                { error: 'bookmarkId is required' },
                { status: 400 }
            )
        }

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

        // 削除操作: 指定されたプレイリストからブックマークを削除
        if (removeFromPlaylistIds.length > 0) {
            const { error: deleteError } = await supabase
                .from('playlist_items')
                .delete()
                .eq('bookmark_id', bookmarkId)
                .in('playlist_id', removeFromPlaylistIds)

            if (deleteError) {
                console.error('Supabase delete error:', deleteError)
                return NextResponse.json(
                    { error: 'Failed to remove from playlists' },
                    { status: 500 }
                )
            }
        }

        // 追加操作: 指定されたプレイリストにブックマークを追加
        if (addToPlaylistIds.length > 0) {
            const resolvedItems = addToPlaylistIds.map((playlistId) => ({
                playlist_id: playlistId,
                bookmark_id: bookmarkId,
            }));

            // upsertで追加（既に存在する場合はスキップ）
            const { error: insertError } = await supabase
                .from('playlist_items')
                .upsert(resolvedItems, {
                    onConflict: 'playlist_id,bookmark_id',
                    ignoreDuplicates: true,
                })

            if (insertError) {
                console.error('Supabase insert error:', insertError)
                return NextResponse.json(
                    { error: 'Failed to add to playlists' },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json(
            {
                message: 'Bulk update completed',
                addedCount: addToPlaylistIds.length,
                removedCount: removeFromPlaylistIds.length,
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
