import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
import { getOrCreateDefaultPlaylist } from '@/lib/playlist-utils'
import type { Bookmark } from '@/types/playlist'

// POST: ブックマーク追加（デフォルトプレイリストに自動関連付け）
export async function POST(request: Request) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response
        const body = await request.json()

        const { article_url, article_title, thumbnail_url, last_read_position } = body

        if (!article_url || !article_title) {
            return NextResponse.json(
                { error: 'article_url and article_title are required' },
                { status: 400 }
            )
        }

        // ブックマークを作成または既存のものを取得
        const { data: bookmark, error: bookmarkError } = await supabase
            .from('bookmarks')
            .upsert(
                {
                    owner_email: userEmail,
                    article_url,
                    article_title,
                    thumbnail_url: thumbnail_url || null,
                    last_read_position: last_read_position || 0,
                },
                {
                    onConflict: 'owner_email,article_url',
                    ignoreDuplicates: false,
                }
            )
            .select()
            .single()

        if (bookmarkError) {
            console.error('Supabase error (bookmark):', bookmarkError)
            return NextResponse.json(
                { error: 'Failed to create bookmark' },
                { status: 500 }
            )
        }

        // デフォルトプレイリストを取得（なければ作成）
        const defaultPlaylistResult = await getOrCreateDefaultPlaylist(userEmail!)
        if (defaultPlaylistResult.error) {
            return NextResponse.json(
                { error: defaultPlaylistResult.error },
                { status: 500 }
            )
        }

        const playlistId = defaultPlaylistResult.id

        // プレイリストに追加（既に存在する場合は無視）
        // 注: positionはDB側のトリガーで自動採番される
        const { error: itemError } = await supabase
            .from('playlist_items')
            .upsert(
                {
                    playlist_id: playlistId,
                    bookmark_id: bookmark.id,
                },
                {
                    onConflict: 'playlist_id,bookmark_id',
                    ignoreDuplicates: true,
                }
            )

        if (itemError) {
            console.error('Supabase error (playlist_items):', itemError)
            // プレイリストアイテムの追加には失敗したが、ブックマーク自体は作成されているため処理は続行する
        }

        return NextResponse.json(bookmark as Bookmark, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/bookmarks:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
