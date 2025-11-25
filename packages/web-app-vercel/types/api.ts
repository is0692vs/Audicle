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

export interface SynthesizeChunk {
  text: string;
  isSplitChunk?: boolean; // true の場合、元の段落が分割されたもの
}

export interface SynthesizeRequest {
  text?: string;
  voice?: string;
  voice_model?: string;      // オプショナル（未指定時はDB設定使用）
  chunks?: SynthesizeChunk[]; // 新しいチャンク形式
  articleUrl?: string;        // 記事メタデータ保存用
}

export interface CacheStats {
  hitRate: number;      // キャッシュヒット率（0.0〜1.0）
  cacheHits: number;    // ヒット数
  cacheMisses: number;  // ミス数
  totalChunks: number;  // 総チャンク数
}

export interface SynthesizeResponse {
  audio?: string; // base64エンコードされた音声データ（旧形式互換）
  audioUrls?: string[]; // 新形式：各チャンクの音声URL
  chunkMetadata?: Array<{  // 新形式：各チャンクのメタデータ
    url: string;
    isSplitChunk?: boolean; // true の場合、元の段落が分割されたもの
  }>;
  mediaType?: string;
  duration?: number;
  cacheStats?: CacheStats; // キャッシュ統計情報
}

// チャンク情報の拡張型（クライアント側で使用）
export interface Chunk {
  id: string;
  text: string; // 表示用テキスト
  cleanedText: string; // TTS送信用のクリーンアップ済みテキスト
  type: string; // 段落タイプ（p, h1, h2, li等）
}
