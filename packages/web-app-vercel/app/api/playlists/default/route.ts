import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

// GET: デフォルトプレイリスト取得（なければ自動作成）
export async function GET() {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response

        // デフォルトプレイリストを検索
        const { data: fetchedPlaylist, error: fetchError } = await supabase
            .from('playlists')
            .select(`
        *,
        playlist_items(
          id,
          playlist_id,
          bookmark_id,
          position,
          added_at,
          bookmark:bookmarks(*)
        )
      `)
            .eq('owner_email', userEmail)
            .eq('is_default', true)
            .order('position', { foreignTable: 'playlist_items', ascending: true })
            .single()

        let playlist = fetchedPlaylist

        // デフォルトプレイリストが存在しない場合は作成
        if (fetchError && fetchError.code === 'PGRST116') {
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
                        ignoreDuplicates: true,
                    }
                )
                .select()
                .single()

            if (createError) {
                console.error('Supabase error (create):', createError)
                return NextResponse.json(
                    { error: 'Failed to create default playlist' },
                    { status: 500 }
                )
            }

            // upsertでignoreDuplicates: trueの場合、既存の行があるとnullが返る可能性がある
            if (!newPlaylist) {
                // 他のリクエストが既に作成した可能性があるので、再取得
                const { data: retryPlaylist, error: retryError } = await supabase
                    .from('playlists')
                    .select(`
            *,
            playlist_items(
              id,
              playlist_id,
              bookmark_id,
              position,
              added_at,
              bookmark:bookmarks(*)
            )
          `)
                    .eq('owner_email', userEmail)
                    .eq('is_default', true)
                    .order('position', { foreignTable: 'playlist_items', ascending: true })
                    .single()

                if (retryError) {
                    console.error('Supabase error (retry):', retryError)
                    return NextResponse.json(
                        { error: 'Failed to fetch default playlist after creation' },
                        { status: 500 }
                    )
                }

                playlist = retryPlaylist
            } else {
                playlist = {
                    ...newPlaylist,
                    playlist_items: [],
                }
            }
        } else if (fetchError) {
            console.error('Supabase error (fetch):', fetchError)
            return NextResponse.json(
                { error: 'Failed to fetch default playlist' },
                { status: 500 }
            )
        }

        // playlist_itemsをitemsにリネームし、不要なプロパティを削除
        const { playlist_items: items = [], ...playlistData } = playlist || {}

        return NextResponse.json({
            ...playlistData,
            items,
            item_count: items.length,
        })
    } catch (error) {
        console.error('Error in GET /api/playlists/default:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
