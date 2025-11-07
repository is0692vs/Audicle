import { supabase } from './supabase'

export interface DefaultPlaylistResult {
  id: string
  error?: string
}

/**
 * ユーザーのデフォルトプレイリストを取得し、存在しない場合は作成する
 * @param userEmail ユーザーemail (nullでないことが保証されている)
 * @returns デフォルトプレイリストのIDまたはエラー
 */
export async function getOrCreateDefaultPlaylist(userEmail: string): Promise<DefaultPlaylistResult> {
  // デフォルトプレイリストを取得
  const { data: defaultPlaylist, error: playlistError } = await supabase
    .from('playlists')
    .select('id')
    .eq('owner_email', userEmail)
    .eq('is_default', true)
    .single()

  if (defaultPlaylist) {
    return { id: defaultPlaylist.id }
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
      .select('id')
      .single()

    if (createError) {
      console.error('Supabase error (create playlist):', createError)
      return { id: '', error: 'Failed to create default playlist' }
    }

    return { id: newPlaylist.id }
  }

  console.error('Supabase error (playlist):', playlistError)
  return { id: '', error: 'Failed to find default playlist' }
}