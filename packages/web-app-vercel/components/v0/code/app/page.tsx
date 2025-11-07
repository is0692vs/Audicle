"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Home, List, Settings, Clock, BookOpen, Plus, ExternalLink, Menu, X } from "lucide-react"
import ReaderView from "@/components/reader-view"

export default function AudiclePage() {
  const [currentView, setCurrentView] = useState<"home" | "playlists" | "settings" | "reader">("home")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<any>(null)
  const [currentChunkId, setCurrentChunkId] = useState<string | undefined>(undefined)

  const articles = [
    {
      id: 1,
      title: "驚くほど似ている（?） JavaとC#の違い",
      url: "https://qiita.com/k12da/items/3417f19b56a8daf5c6e5",
      duration: "15:30",
      addedDate: "2025/11/07 21:54",
      description: "RubyからJavaへシフトしたエンジニアです。これまでは静的型付け言語は敬遠してたのですが...",
      chunks: [
        {
          id: "chunk-1-1",
          text: "RubyからJavaへシフトしたエンジニアです。これまでは静的型付け言語は敬遠してたのですが、Javaを習得することで興味関心の幅が広がりました。",
          type: "p",
        },
        {
          id: "chunk-1-2",
          text: "それで最近、趣味でC言語を学んでみたところJavaとC#が、「君たち、生き別れた兄弟か？」というくらい似ていることに気づき、その共通点や違いをまとめようと思いました。",
          type: "p",
        },
        {
          id: "chunk-1-3",
          text: "本記事は投稿者の嗜好や見解をもとに作成した記事であり、特定の技術や転職を推奨する記事ではありません。C#に関しては理解が浅いため、ご指摘あればコメント頂けると幸いです。",
          type: "p",
        },
      ],
    },
    {
      id: 2,
      title: "【炎上教訓】初日で批判殺到レサービス停止 データ倫理とSNSの闇",
      url: "https://qiita.com/Yukapero/items/b326aa28612b8bfef853",
      duration: "12:45",
      addedDate: "2025/11/07 15:08",
      description: "サービスのリリースとSNSでの炎上について考察...",
      chunks: [
        {
          id: "chunk-2-1",
          text: "新サービスをリリースした初日に、SNS上で大きな批判を受け、サービスを停止せざるを得なくなった経験について共有します。",
          type: "p",
        },
        {
          id: "chunk-2-2",
          text: "データの取り扱いに関する倫理的な問題と、SNSでの情報拡散の速さについて、改めて考えさせられる出来事でした。",
          type: "p",
        },
        {
          id: "chunk-2-3",
          text: "この経験から学んだ教訓と、今後のサービス開発において気をつけるべきポイントをまとめました。",
          type: "p",
        },
      ],
    },
  ]

  const playlists = [
    { id: 1, name: "読み込んだ記事", count: 4, description: "読み込んだ記事が自動的に追加されます" },
    { id: 2, name: "テスト", count: 1, description: "テスト説明" },
  ]

  const openArticle = (article: any) => {
    setSelectedArticle(article)
    setCurrentView("reader")
    setCurrentChunkId(article.chunks[0]?.id)
    setSidebarOpen(false)
  }

  const handleChunkClick = (chunkId: string) => {
    setCurrentChunkId(chunkId)
  }

  return (
    <div className="h-screen flex bg-black text-white overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-black border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-600 bg-clip-text text-transparent">
              Audicle
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Web記事読み上げアプリ</p>
          </div>
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <button
            onClick={() => {
              setCurrentView("home")
              setSidebarOpen(false)
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              currentView === "home" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">ホーム</span>
          </button>

          <button
            onClick={() => {
              setCurrentView("playlists")
              setSidebarOpen(false)
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              currentView === "playlists"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <List className="h-5 w-5" />
            <span className="font-medium">プレイリスト</span>
          </button>

          <button
            onClick={() => {
              setCurrentView("settings")
              setSidebarOpen(false)
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              currentView === "settings" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">設定</span>
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            新しい記事を読む
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-black">
          <Button size="icon" variant="ghost" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold">Audicle</h2>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-zinc-900 to-black">
          <div className="p-4 sm:p-6 lg:p-8">
            {currentView === "home" && (
              <>
                <div className="mb-6 lg:mb-8">
                  <h2 className="text-2xl lg:text-3xl font-bold mb-2">記事一覧</h2>
                  <p className="text-sm lg:text-base text-zinc-400">URLを入力して記事を読み込んでください</p>
                </div>

                <Card className="bg-zinc-900 border-zinc-800 mb-6 lg:mb-8">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        placeholder="記事のURLを入力してください"
                        className="flex-1 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                      <Button className="bg-violet-600 hover:bg-violet-700 sm:w-auto w-full">読込</Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  {articles.map((article) => (
                    <Card
                      key={article.id}
                      className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer group"
                      onClick={() => openArticle(article)}
                    >
                      <CardContent className="p-4 lg:p-6">
                        <div className="flex gap-4 lg:gap-6">
                          <div className="hidden sm:block flex-shrink-0">
                            <div className="w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                              <BookOpen className="h-6 w-6 lg:h-10 lg:w-10 text-white" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base lg:text-lg mb-2 line-clamp-2 group-hover:text-violet-400 transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-xs lg:text-sm text-zinc-400 mb-3 line-clamp-2">{article.description}</p>
                            <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {article.duration}
                              </span>
                              <span className="hidden sm:inline">{article.addedDate}</span>
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-violet-400 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span className="hidden sm:inline">元記事を開く</span>
                                <span className="sm:hidden">元記事</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {currentView === "playlists" && (
              <>
                <div className="mb-6 lg:mb-8">
                  <h2 className="text-2xl lg:text-3xl font-bold mb-2">プレイリスト</h2>
                  <p className="text-sm lg:text-base text-zinc-400">記事をプレイリストで整理</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map((playlist) => (
                    <Card
                      key={playlist.id}
                      className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-4 lg:p-6">
                        <div className="aspect-square bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg mb-4 flex items-center justify-center">
                          <List className="h-12 w-12 lg:h-16 lg:w-16 text-white" />
                        </div>
                        <h3 className="font-bold text-base lg:text-lg mb-1">{playlist.name}</h3>
                        <p className="text-sm text-zinc-400">{playlist.count} 件の記事</p>
                        <p className="text-xs text-zinc-500 mt-2">{playlist.description}</p>
                      </CardContent>
                    </Card>
                  ))}

                  <Card className="bg-zinc-900 border-zinc-800 border-dashed hover:bg-zinc-800 transition-colors cursor-pointer">
                    <CardContent className="p-4 lg:p-6 h-full flex flex-col items-center justify-center text-center min-h-[200px]">
                      <Plus className="h-10 w-10 lg:h-12 lg:w-12 text-zinc-600 mb-2" />
                      <p className="text-zinc-400 text-sm lg:text-base">新規作成</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {currentView === "settings" && (
              <>
                <div className="mb-6 lg:mb-8">
                  <h2 className="text-2xl lg:text-3xl font-bold mb-2">設定</h2>
                  <p className="text-sm lg:text-base text-zinc-400">再生設定をカスタマイズ</p>
                </div>

                <div className="max-w-2xl space-y-6">
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 lg:p-6">
                      <h3 className="font-bold mb-4">再生設定</h3>

                      <div className="space-y-6">
                        <div>
                          <label className="text-sm text-zinc-400 mb-3 block">再生速度: 1.5x</label>
                          <Slider defaultValue={[1.5]} min={0.5} max={3.0} step={0.1} className="w-full" />
                          <p className="text-xs text-zinc-500 mt-2">0.5x〜3.0x（デフォルト: 1.0x）</p>
                        </div>

                        <div>
                          <label className="text-sm text-zinc-400 mb-2 block">言語</label>
                          <select className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm lg:text-base">
                            <option>日本語</option>
                            <option>English</option>
                            <option>中文</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-sm text-zinc-400 mb-2 block">音声モデル</label>
                          <select className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm lg:text-base">
                            <option>日本語 女性 B</option>
                            <option>日本語 男性 A</option>
                            <option>English Female</option>
                            <option>English Male</option>
                          </select>
                        </div>

                        <Button className="w-full bg-violet-600 hover:bg-violet-700">保存</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 lg:p-6">
                      <h3 className="font-bold mb-2">ストレージ使用量</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs lg:text-sm">
                          <span className="text-zinc-400">3.70 KB / 276.26 GB</span>
                          <span className="text-zinc-400">0.0%</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-600" style={{ width: "0.001%" }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {currentView === "reader" && selectedArticle && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 lg:mb-8">
                  <Button
                    variant="ghost"
                    className="mb-4 text-zinc-400 hover:text-white"
                    onClick={() => setCurrentView("home")}
                  >
                    ← 記事一覧に戻る
                  </Button>
                  <h1 className="text-2xl lg:text-4xl font-bold mb-4 text-balance">{selectedArticle.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs lg:text-sm text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {selectedArticle.duration}
                    </span>
                    <span>{selectedArticle.addedDate}</span>
                    <a
                      href={selectedArticle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-violet-400 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      元記事を開く
                    </a>
                  </div>
                </div>

                <ReaderView
                  chunks={selectedArticle.chunks}
                  currentChunkId={currentChunkId}
                  articleUrl={selectedArticle.url}
                  onChunkClick={handleChunkClick}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
