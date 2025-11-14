import { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import type { Playlist } from '@/types/playlist'

type FilterField = 'bookmark_id' | 'article_id'

interface FetchPlaylistsOptions {
    supabase: SupabaseClient
    userEmail: string
    itemId: string
    filterField: FilterField
    includePositionSort?: boolean
}

interface FetchPlaylistsResult {
  playlistsWithItems: unknown[] | null
  playlistsError: PostgrestError | null
}export async function fetchPlaylistsByItem({
    supabase,
    userEmail,
    itemId,
    filterField,
    includePositionSort = true
}: FetchPlaylistsOptions): Promise<FetchPlaylistsResult> {
    let query = supabase
        .from('playlists')
        .select('*, playlist_items!inner(' + filterField + ')')
        .eq('owner_email', userEmail)
        .eq(`playlist_items.${filterField}`, itemId)

    // ソート順の構築
    if (includePositionSort) {
        query = query.order('position', { ascending: true })
    }
    query = query
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

    const { data: playlistsWithItems, error: playlistsError } = await query

    return { playlistsWithItems, playlistsError }
}