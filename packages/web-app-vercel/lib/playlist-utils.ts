import { supabase } from './supabase'
import type { PlaylistWithItems } from '@/types/playlist'

export interface DefaultPlaylistResult {
    playlist?: PlaylistWithItems
    error?: string
}

/**
 * ユーザーのデフォルトプレイリストを取得し、存在しない場合は作成する
 * @param userEmail ユーザーemail (nullでないことが保証されている)
 * @returns デフォルトプレイリストオブジェクトまたはエラー
 */
export async function getOrCreateDefaultPlaylist(userEmail: string): Promise<DefaultPlaylistResult> {
    // デフォルトプレイリストを取得
    const { data: defaultPlaylist, error: playlistError } = await supabase
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

    if (defaultPlaylist) {
        // playlist_itemsをitemsにリネーム
        const { playlist_items: items = [], ...playlistData } = defaultPlaylist
        return { playlist: { ...playlistData, items, item_count: items.length } }
    }

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
            .select()
            .single()

        if (createError) {
            console.error('Supabase error (create playlist):', createError)
            return { error: 'Failed to create default playlist' }
        }

        // 新規作成されたプレイリストにはアイテムがないため、再フェッチせずに手動でオブジェクトを構築します。
        return {
            playlist: {
                ...newPlaylist,
                items: [],
                item_count: 0,
            },
        }
    }

    console.error('Supabase error (playlist):', playlistError)
    return { error: 'Failed to find default playlist' }
}