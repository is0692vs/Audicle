import { redirect } from 'next/navigation'

// モックを定義
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT: ${url}`)
  }),
}))

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

jest.mock('@/lib/supabaseLocal', () => ({
  upsertArticle: jest.fn(),
  addPlaylistItem: jest.fn(),
}))

jest.mock('@/lib/playlist-utils', () => ({
  getOrCreateDefaultPlaylist: jest.fn(),
}))

jest.mock('../AutoCloseComponent', () => ({
  AutoCloseComponent: ({ articleTitle }: { articleTitle: string }) => (
    <div data-testid="auto-close">追加しました: {articleTitle}</div>
  ),
}))

import ShareTargetPage from '../page'
import { auth } from '@/lib/auth'
import { getOrCreateDefaultPlaylist } from '@/lib/playlist-utils'
import * as supabaseLocal from '@/lib/supabaseLocal'
import { supabase } from '@/lib/supabase'

describe('ShareTargetPage', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>
  const mockGetOrCreateDefaultPlaylist = getOrCreateDefaultPlaylist as jest.MockedFunction<
    typeof getOrCreateDefaultPlaylist
  >
  const mockRedirect = redirect as jest.MockedFunction<typeof redirect>

  beforeEach(() => {
    jest.clearAllMocks()
    // デフォルト環境変数をクリア
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  it('URLパラメータがない場合はホームにリダイレクト', async () => {
    const searchParams = Promise.resolve({})

    await expect(ShareTargetPage({ searchParams })).rejects.toThrow('REDIRECT: /')
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('未ログインの場合はログインページにリダイレクト', async () => {
    mockAuth.mockResolvedValue(null)

    const searchParams = Promise.resolve({
      url: 'https://example.com/article',
      title: 'Test Article',
    })

    await expect(ShareTargetPage({ searchParams })).rejects.toThrow(
      /REDIRECT:.*\/auth\/signin/
    )
  })

  it('ログイン済みで記事を追加成功（ローカルモード）', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'test-user', email: 'test@example.com' },
      expires: '2025-12-31',
    })

    mockGetOrCreateDefaultPlaylist.mockResolvedValue({
      playlist: {
        id: 'playlist-1',
        owner_email: 'test@example.com',
        name: '読み込んだ記事',
        visibility: 'private',
        is_default: true,
        allow_fork: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        items: [],
        item_count: 0,
      },
    })

    const mockUpsertArticle = supabaseLocal.upsertArticle as jest.MockedFunction<
      typeof supabaseLocal.upsertArticle
    >
    mockUpsertArticle.mockResolvedValue({
      id: 'article-1',
      owner_email: 'test@example.com',
      url: 'https://example.com/article',
      title: 'Test Article',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      last_read_position: 0,
    })

    const mockAddPlaylistItem = supabaseLocal.addPlaylistItem as jest.MockedFunction<
      typeof supabaseLocal.addPlaylistItem
    >
    mockAddPlaylistItem.mockResolvedValue({
      id: 'item-1',
      playlist_id: 'playlist-1',
      article_id: 'article-1',
      position: 0,
      added_at: '2025-01-01T00:00:00Z',
    })

    const searchParams = Promise.resolve({
      url: 'https://example.com/article',
      title: 'Test Article',
    })

    const result = await ShareTargetPage({ searchParams })

    expect(mockAuth).toHaveBeenCalled()
    expect(mockGetOrCreateDefaultPlaylist).toHaveBeenCalledWith('test@example.com')
    expect(mockUpsertArticle).toHaveBeenCalledWith(
      'test@example.com',
      'https://example.com/article',
      'Test Article',
      undefined,
      0
    )
    expect(mockAddPlaylistItem).toHaveBeenCalledWith('playlist-1', 'article-1')
  })

  it('デフォルトプレイリスト取得失敗時はエラー表示', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'test-user', email: 'test@example.com' },
      expires: '2025-12-31',
    })

    mockGetOrCreateDefaultPlaylist.mockResolvedValue({
      error: 'Failed to create default playlist',
    })

    const searchParams = Promise.resolve({
      url: 'https://example.com/article',
    })

    const result = await ShareTargetPage({ searchParams })

    // エラー表示のReactエレメントが返されることを確認
    expect(result).toBeDefined()
    expect(result.type).toBe('div')
  })

  it('記事追加失敗時はエラー表示', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'test-user', email: 'test@example.com' },
      expires: '2025-12-31',
    })

    mockGetOrCreateDefaultPlaylist.mockResolvedValue({
      playlist: {
        id: 'playlist-1',
        owner_email: 'test@example.com',
        name: '読み込んだ記事',
        visibility: 'private',
        is_default: true,
        allow_fork: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        items: [],
        item_count: 0,
      },
    })

    const mockUpsertArticle = supabaseLocal.upsertArticle as jest.MockedFunction<
      typeof supabaseLocal.upsertArticle
    >
    // 記事作成が失敗した場合（nullを返す）
    mockUpsertArticle.mockResolvedValue(null!)

    const searchParams = Promise.resolve({
      url: 'https://example.com/article',
    })

    const result = await ShareTargetPage({ searchParams })

    // エラー表示のReactエレメントが返されることを確認
    expect(result).toBeDefined()
    expect(result.type).toBe('div')
  })
})
