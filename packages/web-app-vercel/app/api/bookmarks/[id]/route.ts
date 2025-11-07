import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

// DELETE: ブックマーク削除
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response

        const { id } = params

        const { error } = await supabase
            .from('bookmarks')
            .delete()
            .eq('id', id)
            .eq('owner_email', userEmail)

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json(
                { error: 'Failed to delete bookmark' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Bookmark deleted' })
    } catch (error) {
        console.error('Error in DELETE /api/bookmarks/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH: 最後に読んだ位置の更新
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { userEmail, response } = await requireAuth()
        if (response) return response

        const { id } = params
        const body = await request.json()

        const { last_read_position } = body

        if (typeof last_read_position !== 'number') {
            return NextResponse.json(
                { error: 'last_read_position must be a number' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('bookmarks')
            .update({ last_read_position })
            .eq('id', id)
            .eq('owner_email', userEmail)
            .select()
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json(
                { error: 'Failed to update bookmark' },
                { status: 500 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error in PATCH /api/bookmarks/[id]:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
