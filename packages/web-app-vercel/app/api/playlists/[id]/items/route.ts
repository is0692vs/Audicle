import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as supabaseLocal from '@/lib/supabaseLocal'
import { requireAuth } from '@/lib/api-auth'

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const { userEmail, response } = await requireAuth()
        if (response) return response

        // プレイリストの所有権を確認
        const { data: playlist, error: playlistError } = await supabase
            .from('playlists')
            .select('owner_email')
            .eq('id', id)
            .single()

        if (playlistError || !playlist) {
            return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
        }

        if (playlist.owner_email !== userEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // リクエストボディを取得
        const body = await request.json()
        const { article_url, article_title, thumbnail_url, last_read_position } = body

        if (!article_url || !article_title) {
            return NextResponse.json(
                { error: 'article_url and article_title are required' },
                { status: 400 }
            )
        }

        // 記事を作成または既存のものを取得
        let article: any = null
        let articleError: any = null

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            try {
                article = await supabaseLocal.upsertArticle(userEmail, article_url, article_title, thumbnail_url, last_read_position)
            } catch (e) {
                articleError = e
            }
        } else {
            const resp = await supabase
                .from('articles')
                .upsert(
                    {
                        owner_email: userEmail,
                        url: article_url,
                        title: article_title,
                        thumbnail_url: thumbnail_url || null,
                        last_read_position: last_read_position || 0,
                    },
                    {
                        onConflict: 'owner_email,url',
                        ignoreDuplicates: false,
                    }
                )
                .select()
                .single()
            article = resp.data
            articleError = resp.error
        }
            .from('articles')
            .upsert(
                {
                    owner_email: userEmail,
                    url: article_url,
                    title: article_title,
                    thumbnail_url: thumbnail_url || null,
                    last_read_position: last_read_position || 0,
                },
                {
                    onConflict: 'owner_email,url',
                    ignoreDuplicates: false,
                }
            )
            .select()
            .single()

        if (articleError) {
            return NextResponse.json(
                { error: articleError.message || 'Failed to create article' },
                { status: 500 }
            )
        }

        // playlist_itemsにupsert（既に存在する場合は更新扱い）
        let playlistItem: any = null
        let itemError: any = null

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            try {
                playlistItem = await supabaseLocal.addPlaylistItem(created.id, article.id)
            } catch (e) {
                itemError = e
            }
        } else {
            const resp2 = await supabase
                .from('playlist_items')
                .upsert(
                    {
                        playlist_id: id,
                        article_id: article.id,
                    },
                    {
                        onConflict: 'playlist_id,article_id',
                        ignoreDuplicates: false,
                    }
                )
                .select()
                .single()
            playlistItem = resp2.data
            itemError = resp2.error
        }
            .from('playlist_items')
            .upsert(
                {
                    playlist_id: id,
                    article_id: article.id,
                },
                {
                    onConflict: 'playlist_id,article_id',
                    ignoreDuplicates: false,
                }
            )
            .select()
            .single()

        if (itemError) {
            console.error('Supabase error:', itemError)
            return NextResponse.json(
                { error: itemError.message || 'Failed to add item to playlist' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            item: playlistItem,
            article: article,
        })
    } catch (error) {
        console.error('Error in POST /api/playlists/[id]/items:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}

// GET: プレイリストアイテムの一覧取得（読み取り用）
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const { userEmail, response } = await requireAuth()
        if (response) return response

        // プレイリストの所有権を確認
        const { data: playlist, error: playlistError } = await supabase
            .from('playlists')
            .select('owner_email')
            .eq('id', id)
            .single()

        if (playlistError || !playlist) {
            return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
        }

        if (playlist.owner_email !== userEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // プレイリストアイテム（関連する記事情報付き）を取得
        const { data: items, error } = await supabase
            .from('playlist_items')
            .select('id, playlist_id, article_id, position, added_at, article:articles(*)')
            .eq('playlist_id', id)
            .order('position', { ascending: true })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: 'Failed to fetch playlist items' }, { status: 500 })
        }

        return NextResponse.json(items || [])
    } catch (error) {
        console.error('Error in GET /api/playlists/[id]/items:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
