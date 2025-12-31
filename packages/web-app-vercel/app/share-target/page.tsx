import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import * as supabaseLocal from '@/lib/supabaseLocal'
import { getOrCreateDefaultPlaylist } from '@/lib/playlist-utils'
import { AutoCloseComponent } from './AutoCloseComponent'
import type { Article } from '@/types/playlist'

interface ShareTargetPageProps {
  searchParams: Promise<{
    url?: string
    title?: string
  }>
}

export default async function ShareTargetPage({ searchParams }: ShareTargetPageProps) {
  const params = await searchParams
  const sharedUrl = params.url
  const sharedTitle = params.title

  // URLパラメータが存在しない場合はホームへリダイレクト
  if (!sharedUrl) {
    redirect('/')
  }

  // 認証チェック
  const session = await auth()
  
  if (!session || !session.user?.email) {
    // 未ログインの場合はログインページへリダイレクト
    const returnUrl = `/share-target?url=${encodeURIComponent(sharedUrl)}${sharedTitle ? `&title=${encodeURIComponent(sharedTitle)}` : ''}`
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(returnUrl)}`)
  }

  const userEmail = session.user.email

  try {
    // デフォルトプレイリストを取得または作成
    const defaultPlaylistResult = await getOrCreateDefaultPlaylist(userEmail)
    
    if (defaultPlaylistResult.error || !defaultPlaylistResult.playlist) {
      console.error('Failed to get default playlist:', defaultPlaylistResult.error)
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-900">
          <div className="text-center text-white">
            <p className="text-xl">プレイリストの取得に失敗しました</p>
            <p className="text-zinc-400 mt-2">{defaultPlaylistResult.error}</p>
          </div>
        </div>
      )
    }

    const playlistId = defaultPlaylistResult.playlist.id

    // 記事を作成または既存のものを取得
    let article: Article | null = null

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Local fallback
      article = await supabaseLocal.upsertArticle(
        userEmail,
        sharedUrl,
        sharedTitle || 'Shared Article',
        undefined,
        0
      )
    } else {
      // まず既存の記事を検索
      const { data: existingArticle } = await supabase
        .from('articles')
        .select()
        .eq('owner_email', userEmail)
        .eq('url', sharedUrl)
        .single()

      if (existingArticle) {
        // 既存の記事があればタイトルを更新（共有時にタイトルが渡された場合）
        if (sharedTitle) {
          const { data: updated } = await supabase
            .from('articles')
            .update({ title: sharedTitle })
            .eq('id', existingArticle.id)
            .select()
            .single()
          article = updated
        } else {
          article = existingArticle
        }
      } else {
        // 新規作成
        const { data: created } = await supabase
          .from('articles')
          .insert({
            owner_email: userEmail,
            url: sharedUrl,
            title: sharedTitle || 'Shared Article',
            last_read_position: 0,
          })
          .select()
          .single()
        article = created
      }
    }

    if (!article) {
      console.error('Failed to create or fetch article')
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-900">
          <div className="text-center text-white">
            <p className="text-xl">記事の追加に失敗しました</p>
          </div>
        </div>
      )
    }

    // プレイリストに追加（既に存在する場合はスキップ）
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Local fallback
      await supabaseLocal.addPlaylistItem(playlistId, article.id)
    } else {
      // まず既存のアイテムを検索
      const { data: existingItem } = await supabase
        .from('playlist_items')
        .select()
        .eq('playlist_id', playlistId)
        .eq('article_id', article.id)
        .single()

      if (!existingItem) {
        // 新規作成（positionを自動計算）
        const { data: maxPos } = await supabase
          .from('playlist_items')
          .select('position')
          .eq('playlist_id', playlistId)
          .order('position', { ascending: false })
          .limit(1)
          .single()

        const nextPosition = (maxPos?.position ?? -1) + 1

        await supabase
          .from('playlist_items')
          .insert({
            playlist_id: playlistId,
            article_id: article.id,
            position: nextPosition,
          })
      }
    }

    // 成功：自動的に閉じるコンポーネントを表示
    return <AutoCloseComponent articleTitle={sharedTitle || article.title} />
  } catch (error) {
    console.error('Error in share-target:', error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="text-center text-white">
          <p className="text-xl">エラーが発生しました</p>
          <p className="text-zinc-400 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }
}
