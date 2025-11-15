import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
import type { Playlist } from '@/types/playlist'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: articleId } = await context.params
        const { userEmail, response } = await requireAuth()
        if (response) return response

        console.log('API /api/articles/[id]/playlists called with articleId:', articleId, 'userEmail:', userEmail)

        // まずarticle_hashからarticleのURLを取得（article_statsテーブルから）
        const { data: articleStat, error: articleError } = await supabase
            .from('article_stats')
            .select('url')
            .eq('article_hash', articleId)
            .single()

        if (articleError) {
            console.error('Supabase error finding article stats:', articleError)
            return NextResponse.json(
                { error: 'Article not found' },
                { status: 404 }
            )
        }

        if (!articleStat || !articleStat.url) {
            console.log('Article stats not found for hash:', articleId)
            return NextResponse.json([])
        }

        // URLを使ってarticlesテーブルからUUIDを取得
        const { data: article, error: articleLookupError } = await supabase
            .from('articles')
            .select('id')
            .eq('url', articleStat.url)
            .eq('owner_email', userEmail)
            .single()

        if (articleLookupError || !article) {
            console.log('Article not found in articles table for URL:', articleStat.url)
            return NextResponse.json([])
        }

        console.log('Found article UUID:', article.id)

        // article_id を持つプレイリストアイテムを取得
        const { data: playlistItems, error: playlistItemsError } = await supabase
            .from('playlist_items')
            .select('playlist_id')
            .eq('article_id', article.id)

        if (playlistItemsError) {
            console.error('Supabase error:', playlistItemsError)
            return NextResponse.json(
                { error: 'Failed to fetch playlists' },
                { status: 500 }
            )
        }

        console.log('playlistItems:', playlistItems)

        if (!playlistItems || playlistItems.length === 0) {
            console.log('No playlist items found')
            return NextResponse.json([])
        }

        // プレイリストIDのリストを取得
        const playlistIds = playlistItems.map(item => item.playlist_id)

        console.log('playlistIds:', playlistIds)

        // プレイリストを取得（所有権フィルタリング付き）
        const { data: playlists, error: playlistsError } = await supabase
            .from('playlists')
            .select('*')
            .eq('owner_email', userEmail)
            .in('id', playlistIds)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

        if (playlistsError) {
            console.error('Supabase error:', playlistsError)
            return NextResponse.json(
                { error: 'Failed to fetch playlists' },
                { status: 500 }
            )
        }

        console.log('playlists:', playlists)

        return NextResponse.json(playlists as Playlist[])
    } catch (error) {
        console.error('Error in GET /api/articles/[id]/playlists:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
