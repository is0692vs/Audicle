import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
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
        const { data: defaultPlaylist, error: playlistError } = await supabase
            .from('playlists')
            .select('id')
            .eq('owner_email', userEmail)
            .eq('is_default', true)
            .single()

        let playlistId = defaultPlaylist?.id

        if (playlistError && playlistError.code === 'PGRST116') {
            // デフォルトプレイリストが存在しない場合は作成
            const { data: newPlaylist, error: createError } = await supabase
                .from('playlists')
                .upsert(
                    {
                        owner_email: userEmail,
                        name: '読み込んだ記事',
                        description: '読み込んだ記事が自動的に追加されます',
                        visibility: 'private',
                        is_default: true,
                        allow_fork: true,
                    },
                    {
                        onConflict: 'idx_playlists_default_per_user',
                        ignoreDuplicates: false,
                    }
                )
                .select('id')
                .single()

            if (createError) {
                console.error('Supabase error (create playlist):', createError)
                return NextResponse.json(
                    { error: 'Failed to create default playlist' },
                    { status: 500 }
                )
            }

            playlistId = newPlaylist.id
        } else if (playlistError) {
            console.error('Supabase error (playlist):', playlistError)
            return NextResponse.json(
                { error: 'Failed to find default playlist' },
                { status: 500 }
            )
        }

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
