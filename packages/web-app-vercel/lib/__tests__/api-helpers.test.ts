import { resolveArticleId } from '@/lib/api-helpers'

// Mock supabase
jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn(),
    },
}))

import { supabase } from '@/lib/supabase'

type SupaResult = { data: any; error: any }

function makeSelectSingle(result: SupaResult) {
    // Chain object that supports select().eq(...).single() and select().eq(...).eq(...).single()
    const chain: any = {}
    chain.eq = jest.fn(() => chain)
    chain.single = jest.fn().mockResolvedValue(result)

    return {
        select: jest.fn(() => chain),
    }
}

function makeFindArticle(result: SupaResult) {
    // articles lookups often call .select().eq().eq().single(), so give them the same chain behavior
    const chain: any = {}
    chain.eq = jest.fn(() => chain)
    chain.single = jest.fn().mockResolvedValue(result)

    return {
        select: jest.fn(() => chain),
    }
}

function makeInsertArticle(result: SupaResult) {
    const chain: any = {}
    chain.select = jest.fn(() => ({ single: jest.fn().mockResolvedValue(result) }))

    return {
        insert: jest.fn(() => chain),
    }
}

describe('resolveArticleId', () => {
    const { from } = supabase as unknown as { from: jest.Mock }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns uuid when given existing article UUID', async () => {
        const uuid = '11111111-1111-1111-1111-111111111111'
        const userEmail = 'user@example.com'

        from.mockImplementation((table: string) => {
            if (table === 'articles') {
                return makeSelectSingle({ data: { id: uuid }, error: null })
            }
            return makeSelectSingle({ data: null, error: null })
        })

        await expect(resolveArticleId(uuid, userEmail)).resolves.toEqual(uuid)
    })

    it('throws Article not found when UUID does not exist', async () => {
        const uuid = '22222222-2222-2222-2222-222222222222'
        const userEmail = 'user@example.com'

        from.mockImplementation((table: string) => {
            if (table === 'articles') {
                return makeSelectSingle({ data: null, error: { code: 'PGRST116' } })
            }
            return makeSelectSingle({ data: null, error: null })
        })

        await expect(resolveArticleId(uuid, userEmail)).rejects.toThrow('Article not found')
    })

    it('throws Article not found when user is not owner', async () => {
        const uuid = '33333333-3333-3333-3333-333333333333'
        const userEmail = 'user@example.com'

        from.mockImplementation((table: string) => {
            if (table === 'articles') {
                return makeSelectSingle({ data: null, error: { message: 'No rows found' } })
            }
            return makeSelectSingle({ data: null, error: null })
        })

        await expect(resolveArticleId(uuid, userEmail)).rejects.toThrow('Article not found')
    })

    it('throws Article stats not found for unknown article_hash', async () => {
        const hash = 'hash-abc'
        const userEmail = 'user@example.com'

        from.mockImplementation((table: string) => {
            if (table === 'article_stats') {
                return makeSelectSingle({ data: null, error: { code: 'PGRST116' } })
            }
            return makeSelectSingle({ data: null, error: null })
        })

        await expect(resolveArticleId(hash, userEmail)).rejects.toThrow('Article stats not found')
    })

    it('returns existing article id when article exists for article_hash', async () => {
        const hash = 'hash-exists'
        const userEmail = 'user@example.com'

        from.mockImplementation((table: string) => {
            if (table === 'article_stats') {
                return makeSelectSingle({ data: { url: 'https://example.com', title: 'Test' }, error: null })
            }
            if (table === 'articles') {
                return makeFindArticle({ data: { id: 'existing-uuid' }, error: null })
            }
            return makeSelectSingle({ data: null, error: null })
        })

        await expect(resolveArticleId(hash, userEmail)).resolves.toEqual('existing-uuid')
    })

    it('inserts new article and returns id when not found', async () => {
        const hash = 'hash-insert'
        const userEmail = 'user@example.com'

        from.mockImplementation((table: string) => {
            if (table === 'article_stats') {
                return makeSelectSingle({ data: { url: 'https://example.com', title: 'Test' }, error: null })
            }
            if (table === 'articles') {
                // First call to search returns not found
                // We need to simulate .select(...).eq(...).eq(...).single() returning not found
                // The findArticle() will use the 'articles' chain first; second call is insert().select().single()
                return {
                    select: jest.fn(() => ({
                        eq: jest.fn(() => ({
                            eq: jest.fn(() => ({ single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }) })),
                        })),
                    })),
                    insert: jest.fn(() => ({
                        select: jest.fn(() => ({
                            single: jest.fn().mockResolvedValue({ data: { id: 'new-uuid' }, error: null }),
                        })),
                    })),
                }
            }
            return makeSelectSingle({ data: null, error: null })
        })

        await expect(resolveArticleId(hash, userEmail)).resolves.toEqual('new-uuid')
    })

    it('handles insert conflict and returns existing article', async () => {
        const hash = 'hash-conflict'
        const userEmail = 'user@example.com'

        // We'll need to simulate findArticle -> not found, insert -> unique_violation, second findArticle -> found
        const articleCalls: any[] = []

        from.mockImplementation((table: string) => {
            if (table === 'article_stats') {
                return makeSelectSingle({ data: { url: 'https://example.com', title: 'Test' }, error: null })
            }
            if (table === 'articles') {
                articleCalls.push(true)
                // on first call, findArticle returns not found
                if (articleCalls.length === 1) {
                    return makeFindArticle({ data: null, error: { code: 'PGRST116' } })
                }
                // second call will be insert() -> return conflict
                if (articleCalls.length === 2) {
                    return makeInsertArticle({ data: null, error: { code: '23505', message: 'unique_violation' } })
                }
                // third call is retry findArticle and returns existing
                return makeFindArticle({ data: { id: 'existing-uuid' }, error: null })
            }
            return makeSelectSingle({ data: null, error: null })
        })

        await expect(resolveArticleId(hash, userEmail)).resolves.toEqual('existing-uuid')
    })

    it('throws if insert fails with non-conflict error', async () => {
        const hash = 'hash-insert-fail'
        const userEmail = 'user@example.com'

        from.mockImplementation((table: string) => {
            if (table === 'article_stats') {
                return makeSelectSingle({ data: { url: 'https://example.com', title: 'Test' }, error: null })
            }
            if (table === 'articles') {
                return {
                    select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }) })), })), })),
                    insert: jest.fn(() => ({
                        select: jest.fn(() => ({
                            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'Insert failed' } }),
                        })),
                    })),
                }
            }
            return makeSelectSingle({ data: null, error: null })
        })

        await expect(resolveArticleId(hash, userEmail)).rejects.toThrow('Failed to create article record: Insert failed')
    })

    it('throws when retry after insert conflict still fails', async () => {
        const hash = 'hash-conflict-fail'
        const userEmail = 'user@example.com'

        const articleCalls: any[] = []

        from.mockImplementation((table: string) => {
            if (table === 'article_stats') {
                return makeSelectSingle({ data: { url: 'https://example.com', title: 'Test' }, error: null })
            }
            if (table === 'articles') {
                articleCalls.push(true)
                if (articleCalls.length === 1) {
                    return makeFindArticle({ data: null, error: { code: 'PGRST116' } })
                }
                if (articleCalls.length === 2) {
                    return makeInsertArticle({ data: null, error: { code: '23505', message: 'unique_violation' } })
                }
                return makeFindArticle({ data: null, error: { message: 'Still not found' } })
            }
            return makeSelectSingle({ data: null, error: null })
        })

        await expect(resolveArticleId(hash, userEmail)).rejects.toThrow('Failed to retrieve article after insert conflict')
    })
})
