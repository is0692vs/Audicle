import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SynthesizeRequest } from '@/types/api';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';

// Node.js runtimeを明示的に指定（Google Cloud TTS SDKはEdge Runtimeで動作しない）
export const runtime = 'nodejs';
// 動的レンダリングを強制（キャッシュを無効化）
export const dynamic = 'force-dynamic';

// 許可リスト（環境変数から取得、カンマ区切り）
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split(',').map(e => e.trim()) || [];

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
        const { text, voice, speed, voice_model, playback_speed } = body as SynthesizeRequest & { speed?: number };

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Text is required and must be a string' },
                { status: 400, headers: corsHeaders }
            );
        }

        if (text.trim().length === 0) {
            return NextResponse.json(
                { error: 'Text must not be empty' },
                { status: 400, headers: corsHeaders }
            );
        }

        const voiceToUse = voice_model || voice || 'ja-JP-Standard-B';
        const speakingRate = playback_speed || speed || 1.0;

        // テキストを分割
        const textChunks = splitText(text);
        if (textChunks.length === 0) {
            return NextResponse.json(
                { error: 'Failed to process text' },
                { status: 400, headers: corsHeaders }
            );
        }

        // 各チャンクを合成
        const audioChunks: Buffer[] = [];
        for (const chunk of textChunks) {
            const audioBuffer = await synthesizeToBuffer(chunk, voiceToUse, speakingRate);
            audioChunks.push(audioBuffer);
        }

        // すべてのオーディオチャンクを結合
        const fullAudio = Buffer.concat(audioChunks);

        // MP3データをbase64エンコード
        const base64Audio = fullAudio.toString('base64');

        return NextResponse.json(
            {
                audio: base64Audio,
                mediaType: 'audio/mpeg',
                duration: 0, // 実際の長さは計算が複雑なため0
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
