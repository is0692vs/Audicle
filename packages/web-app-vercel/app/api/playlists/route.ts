import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'
import type { Playlist } from '@/types/playlist'

// GET: ユーザーのプレイリスト一覧取得
export async function GET() {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response

        const { data, error } = await supabase
            .from('playlists')
            .select('*, playlist_items(count)')
            .eq('owner_email', userEmail)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch playlists' },
                { status: 500 }
            )
        }

        // カウントを含めて整形
        const playlists = data.map((playlist: Playlist & { playlist_items?: { count: number }[] }) => ({
            ...playlist,
            item_count: playlist.playlist_items?.[0]?.count || 0,
            playlist_items: undefined,
        }))

        return NextResponse.json(playlists)
    } catch (error) {
        console.error('Error in GET /api/playlists:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST: プレイリスト作成
export async function POST(request: Request) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response
        const body = await request.json()

        const { name, description } = body

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('playlists')
            .insert({
                owner_email: userEmail,
                name,
                description: description || null,
                visibility: 'private',
                is_default: false,
                allow_fork: true,
            })
            .select()
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json(
                { error: 'Failed to create playlist' },
                { status: 500 }
            )
        }

        return NextResponse.json(data as Playlist, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/playlists:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
