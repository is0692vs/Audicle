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
  voice_model?: string;      // オプショナル（未指定時はDB設定使用）
  playback_speed?: number;   // オプショナル（未指定時はDB設定使用）
}

export interface SynthesizeResponse {
  audio: string; // base64エンコードされた音声データ
  mediaType: string;
  duration: number;
}

// チャンク情報の拡張型（クライアント側で使用）
export interface Chunk {
  id: string;
  text: string; // 表示用テキスト
  cleanedText: string; // TTS送信用のクリーンアップ済みテキスト
  type: string; // 段落タイプ（p, h1, h2, li等）
}
