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
    const { data: articleStat, error: statError } = await supabase
        .from('article_stats')
        .select('url')
        .eq('article_hash', articleId)
        .single()

    if (statError || !articleStat?.url) {
        throw new Error('Article stats not found')
    }

    const { data: article, error: lookupError } = await supabase
        .from('articles')
        .select('id')
        .eq('url', articleStat.url)
        .eq('owner_email', userEmail)
        .single()

    if (lookupError || !article) {
        throw new Error('Article not found in user bookmarks')
    }

    return article.id
}