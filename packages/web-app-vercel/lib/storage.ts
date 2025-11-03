// 記事データの型定義と保存機能

import { Chunk } from "@/types/api";

export interface Article {
  id: string;
  url: string;
  title: string;
  chunks: Chunk[];
  createdAt: number;
}

const STORAGE_KEY = "auticle_articles";

export const articleStorage = {
  // すべての記事を取得
  getAll: (): Article[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // 記事を追加
  add: (article: Omit<Article, "id" | "createdAt">): Article => {
    const newArticle: Article = {
      ...article,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    const articles = articleStorage.getAll();
    articles.unshift(newArticle); // 先頭に追加
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
    return newArticle;
  },

  // 記事を削除
  remove: (id: string): void => {
    const articles = articleStorage.getAll().filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  },

  // IDで記事を取得
  getById: (id: string): Article | undefined => {
    return articleStorage.getAll().find((a) => a.id === id);
  },

  // すべてクリア
  clear: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },
};
