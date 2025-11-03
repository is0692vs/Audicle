// API Server のリクエスト・レスポンス型定義

export interface ExtractRequest {
  url: string;
}

export interface ExtractResponse {
  title: string;
  content: string;
  textLength: number;
  author?: string;
  siteName?: string;
}

export interface SynthesizeRequest {
  text: string;
  voice?: string;
}

// チャンク情報の拡張型（クライアント側で使用）
export interface Chunk {
  id: string;
  text: string;
}
