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
        const { data: article, error } = await supabase
            .from('articles')
            .select('id')
            .eq('id', articleId)
            .eq('owner_email', userEmail)
            .single()

        if (error || !article) {
            throw new Error('Article not found')
        }
        return article.id
    }

    // article_hash の場合、2段階クエリ
    // 1. article_stats から url と title を取得
    const { data: articleStat, error: statError } = await supabase
        .from('article_stats')
        .select('url, title')
        .eq('article_hash', articleId)
        .single()

    if (statError || !articleStat?.url) {
        throw new Error('Article stats not found')
    }

    // 2. articles テーブルを検索または作成
    let { data: article, error: articleError } = await supabase
        .from('articles')
        .select('id')
        .eq('url', articleStat.url)
        .eq('owner_email', userEmail)
        .single()

    if (articleError && articleError.code === 'PGRST116') { // Not found
        // レコードが存在しない場合は作成
        const { data: newArticle, error: insertError } = await supabase
            .from('articles')
            .insert({
                url: articleStat.url,
                title: articleStat.title,
                owner_email: userEmail,
                created_at: new Date().toISOString()
            })
            .select('id')
            .single()

        if (insertError) {
            throw new Error('Failed to create article record')
        }
        return newArticle.id
    }

    if (articleError) {
        throw new Error('Article lookup failed')
    }

    return article.id
}