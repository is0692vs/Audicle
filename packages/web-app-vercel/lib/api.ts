'use client';

import {
  ExtractRequest,
  ExtractResponse,
  SynthesizeRequest,
} from "@/types/api";
import { logger } from "./logger";

/**
 * URLから本文を抽出する
 */
export async function extractContent(url: string): Promise<ExtractResponse> {
  const request: ExtractRequest = { url };

  logger.apiRequest("POST", "/api/extract", request);

  const response = await fetch("/api/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`抽出エラー: ${error}`);
    throw new Error(`抽出に失敗しました: ${error}`);
  }

  const data = await response.json();
  logger.apiResponse("/api/extract", data);

  return data;
}

/**
 * テキストを音声に変換する
 * @returns 音声データのBlobを返す
 */
export async function synthesizeSpeech(
  text: string,
  voice?: string,
  speed?: number,
  voiceModel?: string
): Promise<Blob> {
  const request: SynthesizeRequest & { speed?: number } = { text };
  if (voice) {
    request.voice = voice;
  }
  if (speed) {
    request.speed = speed;
  }
  if (voiceModel) {
    request.voice_model = voiceModel;
  }
  // playbackSpeedはフロントエンドでの再生速度制御用なのでAPIには渡さない

  logger.apiRequest("POST", "/api/synthesize", {
    text: text.substring(0, 50) + "...",
    voice,
    speed,
    voiceModel,
    // playbackSpeedはフロントエンド制御用
  });

  const response = await fetch("/api/synthesize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`音声合成エラー: ${error}`);
    throw new Error(`音声合成に失敗しました: ${error}`);
  }

  const data = await response.json();

  // base64エンコードされた音声データをBlobに変換
  const audioData = data.audio;
  const binaryString = atob(audioData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: 'audio/mpeg' });
  logger.success(`音声合成完了: ${blob.size} bytes`);

  return blob;
}
