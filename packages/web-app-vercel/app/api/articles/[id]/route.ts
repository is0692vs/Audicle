import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

// GET /api/articles/[id]
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { userEmail, response } = await requireAuth()
    if (response) return response

    // Fetch article record
    const { data: article, error } = await supabase
      .from('articles')
      .select('id, url, title, thumbnail_url, last_read_position')
      .eq('id', id)
      .eq('owner_email', userEmail)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 })
    }

    return NextResponse.json(article)
  } catch (err) {
    console.error('Error in GET /api/articles/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
