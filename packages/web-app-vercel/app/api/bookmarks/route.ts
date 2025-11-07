import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Bookmark } from '@/types/playlist'

// POST: ブックマーク追加（デフォルトプレイリストに自動関連付け）
export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session || !session.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userEmail = session.user.email
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

        // デフォルトプレイリストを取得
        const { data: defaultPlaylist, error: playlistError } = await supabase
            .from('playlists')
            .select('id')
            .eq('owner_email', userEmail)
            .eq('is_default', true)
            .single()

        if (playlistError) {
            console.error('Supabase error (playlist):', playlistError)
            return NextResponse.json(
                { error: 'Failed to find default playlist' },
                { status: 500 }
            )
        }

        // 既存のアイテム数を取得してpositionを決定
        const { count } = await supabase
            .from('playlist_items')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', defaultPlaylist.id)

        const position = count || 0

        // プレイリストに追加（既に存在する場合は無視）
        const { error: itemError } = await supabase
            .from('playlist_items')
            .upsert(
                {
                    playlist_id: defaultPlaylist.id,
                    bookmark_id: bookmark.id,
                    position,
                },
                {
                    onConflict: 'playlist_id,bookmark_id',
                    ignoreDuplicates: true,
                }
            )

        if (itemError) {
            console.error('Supabase error (playlist_items):', itemError)
            // プレイリストアイテムの追加に失敗してもブックマークは作成されているので、
            // エラーを返すが成功扱いにする
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
