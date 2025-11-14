import { SupabaseClient } from '@supabase/supabase-js'

type FilterField = 'bookmark_id' | 'article_id'

interface FetchPlaylistsOptions {
    supabase: SupabaseClient
    userEmail: string
    itemId: string
    filterField: FilterField
    includePositionSort?: boolean
}

export async function fetchPlaylistsByItem({
    supabase,
    userEmail,
    itemId,
    filterField,
    includePositionSort = true
}: FetchPlaylistsOptions) {
    let query = supabase
        .from('playlists')
        .select('*, playlist_items!inner(bookmark_id, article_id)')
        .eq('owner_email', userEmail)
        .eq(`playlist_items.${filterField}`, itemId)

    // ソート順の構築
    if (includePositionSort) {
        query = query.order('position', { ascending: true })
    }
    query = query
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

    const { data, error } = await query

    return { data, error }
}