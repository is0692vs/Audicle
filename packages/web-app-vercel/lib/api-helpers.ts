import { supabase } from '@/lib/supabase'

/**
 * articleId が UUID か article_hash かを判定し、必要に応じて変換して実際の article UUID を返す
 * @param articleId - UUID または article_hash
 * @param userEmail - ユーザーemail (所有権確認用)
 * @returns 実際の article UUID
 */
export async function resolveArticleId(articleId: string, userEmail: string): Promise<string> {
    // UUID の場合、所有権確認
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) {
        const { data: article, error: articleError } = await supabase
            .from('articles')
            .select('id')
            .eq('id', articleId)
            .eq('owner_email', userEmail)
            .single()

        if (articleError || !article) {
            throw new Error('Article not found')
        }

        return article.id
    }

    // article_hash の場合、article_stats から URL を取得し、articles から UUID を取得
    const { data, error } = await supabase
        .from('article_stats')
        .select('articles!inner(id)')
        .eq('article_hash', articleId)
        .eq('articles.owner_email', userEmail)
        .single()

    if (error || !data?.articles) {
        throw new Error('Article not found or not owned by user')
    }

    return (data.articles as { id: string }).id
}