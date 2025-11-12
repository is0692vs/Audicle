import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export interface PopularArticle {
  articleHash: string;
  url: string;
  title: string;
  domain: string;
  accessCount: number;
  uniqueUsers: number;
  cacheHitRate: number;
  isFullyCached: boolean;
  lastAccessedAt: string;
}

interface PopularArticlesResponse {
  articles: PopularArticle[];
  total: number;
}

type Period = 'today' | 'week' | 'month' | 'all';

/**
 * 期間に応じた日付計算
 */
function getPeriodDate(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.setHours(0, 0, 0, 0));
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return weekAgo;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return monthAgo;
    case 'all':
      return null;
    default:
      return null;
  }
}

/**
 * GET /api/stats/popular
 * 人気記事を取得
 */
export async function GET(request: NextRequest) {
  try {
    // セッション認証
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || 'week') as Period;
    const domain = searchParams.get('domain');
    const limitParam = searchParams.get('limit');
    
    // リミットの検証（デフォルト20、最大100）
    let limit = 20;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }

    // 期間フィルタリング用の日付を取得
    const periodDate = getPeriodDate(period);

    // Supabaseクエリの構築
    let query = supabase
      .from('article_stats')
      .select('*')
      .order('access_count', { ascending: false })
      .limit(limit);

    // 期間フィルタリング
    if (periodDate) {
      query = query.gte('last_accessed_at', periodDate.toISOString());
    }

    // ドメインフィルタリング
    if (domain) {
      query = query.eq('domain', domain);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch popular articles', details: error.message },
        { status: 500 }
      );
    }

    // レスポンスの整形
    const articles: PopularArticle[] = (data || []).map((row) => ({
      articleHash: row.article_hash,
      url: row.url,
      title: row.title,
      domain: row.domain,
      accessCount: row.access_count,
      uniqueUsers: row.unique_users,
      cacheHitRate: parseFloat(row.cache_hit_rate.toFixed(2)),
      isFullyCached: row.is_fully_cached,
      lastAccessedAt: row.last_accessed_at,
    }));

    const response: PopularArticlesResponse = {
      articles,
      total: articles.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Popular articles error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
