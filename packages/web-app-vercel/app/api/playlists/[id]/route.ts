import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET: プレイリスト詳細取得（ブックマーク含む）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const { id } = await params

    // プレイリスト情報取得
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .eq('owner_email', userEmail)
      .single()

    if (playlistError) {
      console.error('Supabase error:', playlistError)
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      )
    }

    // ブックマーク一覧取得
    const { data: items, error: itemsError } = await supabase
      .from('playlist_items')
      .select(`
        id,
        playlist_id,
        bookmark_id,
        position,
        added_at,
        bookmark:bookmarks(*)
      `)
      .eq('playlist_id', id)
      .order('position', { ascending: true })

    if (itemsError) {
      console.error('Supabase error:', itemsError)
      return NextResponse.json(
        { error: 'Failed to fetch playlist items' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...playlist,
      items,
      item_count: items?.length || 0,
    })
  } catch (error) {
    console.error('Error in GET /api/playlists/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: プレイリスト更新
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const { id } = await params
    const body = await request.json()

    const { name, description } = body

    const { data, error } = await supabase
      .from('playlists')
      .update({
        name,
        description,
      })
      .eq('id', id)
      .eq('owner_email', userEmail)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update playlist' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH /api/playlists/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: プレイリスト削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const { id } = await params

    // デフォルトプレイリストは削除不可
    const { data: playlist } = await supabase
      .from('playlists')
      .select('is_default')
      .eq('id', id)
      .eq('owner_email', userEmail)
      .single()

    if (playlist?.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default playlist' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id)
      .eq('owner_email', userEmail)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete playlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Playlist deleted' })
  } catch (error) {
    console.error('Error in DELETE /api/playlists/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
