import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SynthesizeRequest, CacheStats } from '@/types/api';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { put, head } from '@vercel/blob';
import crypto from 'crypto';

// Node.js runtimeを明示的に指定（Google Cloud TTS SDKはEdge Runtimeで動作しない）
export const runtime = 'nodejs';
// 動的レンダリングを強制（キャッシュを無効化）
export const dynamic = 'force-dynamic';

// 許可リスト（環境変数から取得、カンマ区切り）
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split(',').map(e => e.trim()) || [];

// MD5ハッシュ計算関数
function calculateHash(text: string): string {
    return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

// Google Cloud TTS クライアント
let ttsCLient: TextToSpeechClient | null = null;

function getTTSClient(): TextToSpeechClient {
    if (ttsCLient) {
        return ttsCLient;
    }

    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set');
    }

    try {
        const credentials = JSON.parse(credentialsJson);
        ttsCLient = new TextToSpeechClient({
            credentials,
        });
        return ttsCLient;
    } catch {
        throw new Error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON');
    }
}

// Google Cloud TTS APIの最大リクエストバイト数
const MAX_TTS_BYTES = 5000;

function splitText(text: string): string[] {
    /**
     * テキストをGoogle Cloud TTS APIの制限内に分割する
     * 最大5000バイトごとに分割
     */
    const chunks: string[] = [];
    let currentChunk = '';

    // 。、！、？、\nなどで分割
    const sentences = text.split(/([。！？\n])/);

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (!sentence) continue;

        // 句読点を前の文字に結合
        if (/^[。！？\n]$/.test(sentence) && currentChunk) {
            currentChunk += sentence;
            continue;
        }

        const combined = currentChunk + sentence;
        if (Buffer.byteLength(combined, 'utf8') > MAX_TTS_BYTES) {
            if (currentChunk) {
                chunks.push(currentChunk);
            }
            currentChunk = sentence;
        } else {
            currentChunk = combined;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    // 1チャンクが5000バイトを超える場合、文字単位で分割
    const finalChunks: string[] = [];
    for (const chunk of chunks) {
        if (Buffer.byteLength(chunk, 'utf8') <= MAX_TTS_BYTES) {
            finalChunks.push(chunk);
        } else {
            // 文字単位で強制分割
            let current = '';
            for (const char of chunk) {
                const test = current + char;
                if (Buffer.byteLength(test, 'utf8') > MAX_TTS_BYTES) {
                    if (current) {
                        finalChunks.push(current);
                    }
                    current = char;
                } else {
                    current = test;
                }
            }
            if (current) {
                finalChunks.push(current);
            }
        }
    }

    return finalChunks.filter(chunk => chunk.trim().length > 0);
}

async function synthesizeToBuffer(text: string, voice: string, speakingRate: number = 2.0): Promise<Buffer> {
    const client = getTTSClient();

    const synthesisInput: protos.google.cloud.texttospeech.v1.ISynthesisInput = {
        text: text,
    };

    const voiceParams: protos.google.cloud.texttospeech.v1.IVoiceSelectionParams = {
        languageCode: 'ja-JP',
        name: voice || 'ja-JP-Neural2-B',
    };

    const audioConfig: protos.google.cloud.texttospeech.v1.IAudioConfig = {
        audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
        speakingRate: speakingRate,
    };

    try {
        const [response] = await client.synthesizeSpeech({
            input: synthesisInput,
            voice: voiceParams,
            audioConfig: audioConfig,
        });

        const audioContent = response.audioContent;
        if (!audioContent) {
            throw new Error('No audio content in response');
        }

        return Buffer.isBuffer(audioContent) ? audioContent : Buffer.from(audioContent);
    } catch (error) {
        console.error('Google Cloud TTS API error:', error);
        throw new Error(`TTS synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function POST(request: NextRequest) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        // 認証チェック
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        // 許可リストチェック
        if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(session.user.email)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders });
        }

        // リクエストボディをパース
        const body = await request.json();
        const speakingRate = body.speakingRate || 1.0;

        // 旧形式（text + voiceModel）または新形式（chunks + voice）の両方をサポート
        const textChunks = body.chunks
            ? body.chunks.map((c: any) => c.text)
            : [body.text];

        const voiceToUse = body.voice || body.voiceModel || 'ja-JP-Standard-B';

        // キャッシュ統計情報
        let cacheHits = 0;
        let cacheMisses = 0;

        // 各チャンクを合成またはキャッシュから取得
        const audioUrls: string[] = [];

        for (const chunkText of textChunks) {
            const textHash = calculateHash(chunkText);
            const cacheKey = `${textHash}:${voiceToUse}.mp3`;

            // 1. キャッシュ存在確認
            const blobExists = await head(cacheKey).catch((error) => {
                console.error(`Failed to check cache for key ${cacheKey}:`, error);
                return null;
            });

            if (blobExists) {
                console.log(`Cache hit for key: ${cacheKey}`);
                cacheHits++;
                audioUrls.push(blobExists.url);
                continue;
            }

            // 2. キャッシュミス：TTS生成
            console.log(`Cache miss for key: ${cacheKey}`);
            cacheMisses++;
            const audioBuffer = await synthesizeToBuffer(chunkText, voiceToUse, speakingRate);

            // 3. Vercel Blobに保存（失敗時はbase64にフォールバック）
            try {
                const blob = await put(cacheKey, audioBuffer, {
                    access: 'public',
                    contentType: 'audio/mpeg',
                    addRandomSuffix: false,
                });
                audioUrls.push(blob.url);
            } catch (putError) {
                console.error(`Failed to save audio to cache, falling back to base64 for key ${cacheKey}:`, putError);
                const base64Audio = audioBuffer.toString('base64');
                audioUrls.push(`data:audio/mpeg;base64,${base64Audio}`);
            }
        }        // キャッシュヒット率を計算
        const totalChunks = textChunks.length;
        const hitRate = totalChunks > 0 ? cacheHits / totalChunks : 0;

        const cacheStats: CacheStats = {
            hitRate,
            cacheHits,
            cacheMisses,
            totalChunks,
        };

        console.log(`Cache stats - Hits: ${cacheHits}, Misses: ${cacheMisses}, Rate: ${(hitRate * 100).toFixed(2)}%`);

        return NextResponse.json(
            {
                audioUrls,
                cacheStats,
            },
            {
                headers: corsHeaders,
            }
        );
    } catch (error) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        console.error('Synthesize error:', error);

        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { error: 'Failed to synthesize speech' },
            { status: 500, headers: corsHeaders }
        );
    }
}
