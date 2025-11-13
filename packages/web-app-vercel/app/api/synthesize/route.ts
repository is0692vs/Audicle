import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getKv } from '@/lib/kv';
import { parseArticleMetadata, serializeArticleMetadata } from '@/lib/kv-helpers';
import { CacheStats, SynthesizeChunk } from '@/types/api';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { put, head } from '@vercel/blob';
import crypto from 'crypto';

// Node.js runtimeを明示的に指定（Google Cloud TTS SDKはEdge Runtimeで動作しない）
export const runtime = 'nodejs';
// 動的レンダリングを強制（キャッシュを無効化）
export const dynamic = 'force-dynamic';

// 許可リスト（環境変数から取得、カンマ区切り）
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split(',').map(e => e.trim()) || [];

// 人気記事判定の閾値
const POPULAR_ARTICLE_READ_COUNT_THRESHOLD = 5;

// MD5ハッシュ計算関数
function calculateHash(text: string): string {
    return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

// 記事ハッシュ計算関数を追加
function calculateArticleHash(chunks: string[]): string {
    const content = chunks.join('\n');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    return hash.substring(0, 16);
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

        // デバッグログ
        console.log('[DEBUG] Request params:', {
            hasText: !!body.text,
            hasArticleUrl: !!body.articleUrl,
            hasChunks: !!body.chunks,
            voice: body.voice || body.voice_model
        });

        // 入力バリデーション
        if (!body.chunks && !body.text) {
            return NextResponse.json(
                { error: 'text or chunks is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const speakingRate = body.speakingRate || 1.0;

        // 旧形式（text + voiceModel）または新形式（chunks + voice）の両方をサポート
        const textChunks = body.chunks
            ? body.chunks.map((c: SynthesizeChunk) => c.text)
            : [body.text];

        const voiceToUse = body.voice || body.voice_model || 'ja-JP-Standard-B';
        const { articleUrl, chunks, chunkIndex } = body;

        // 記事メタデータ処理
        let isPopularArticle = false;

        if (articleUrl) {
            const kv = await getKv();
            if (kv) {
                const currentHash = calculateArticleHash(textChunks);
                const metadataKey = `article:${articleUrl}:${voiceToUse}`;

                try {
                    // Hash全体を取得
                    const metadataHash = await kv.hgetall(metadataKey);
                    const metadata = parseArticleMetadata(metadataHash);

                    if (!metadata || metadata.articleHash !== currentHash) {
                        // メタデータなし or 編集検知 → 新規作成
                        await kv.hset(metadataKey, serializeArticleMetadata({
                            articleUrl,
                            articleHash: currentHash,
                            voice: voiceToUse,
                            totalChunks: textChunks.length,
                            readCount: 1,
                            completedPlayback: false,
                            lastPlayedChunk: chunkIndex ?? 0,
                            lastUpdated: new Date().toISOString(),
                            lastAccessed: new Date().toISOString()
                        }));
                        console.log(`[INFO] ✅ Metadata saved (new) for article: ${articleUrl}`);
                    } else {
                        // 既存メタデータあり
                        const isPopular = metadata.readCount >= POPULAR_ARTICLE_READ_COUNT_THRESHOLD && metadata.completedPlayback === true;

                        if (isPopular) {
                            isPopularArticle = true;
                        }

                        // アトミック操作：readCountをインクリメント
                        await kv.hincrby(metadataKey, 'readCount', 1);

                        // lastAccessedを更新
                        await kv.hset(metadataKey, { lastAccessed: new Date().toISOString() });
                        console.log(`[INFO] ✅ Metadata updated for article: ${articleUrl}`);
                    }
                } catch (kvError) {
                    console.error('[ERROR] ❌ Failed to save metadata:', kvError);
                    // KVエラー時は通常フローにフォールバック
                }
            }
        }

        // キャッシュ統計情報
        let cacheHits = 0;
        let cacheMisses = 0;

        // 各チャンクを合成またはキャッシュから取得
        const audioUrls: string[] = [];
        const audioBuffers: Buffer[] = [];

        for (const chunkText of textChunks) {
            const textHash = calculateHash(chunkText);
            const cacheKey = `${textHash}:${voiceToUse}.mp3`;

            // 1. キャッシュ存在確認
            let blobExists = null;

            if (isPopularArticle) {
                // 人気記事の場合、キャッシュミス時のログを警告レベルに下げる
                const cached = await head(cacheKey).catch(() => null);
                if (cached) {
                    blobExists = cached;
                } else {
                    console.warn(`Cache miss for popular article, fallback to TTS for key ${cacheKey}`);
                }
            } else {
                blobExists = await head(cacheKey).catch((error) => {
                    console.error(`Failed to check cache for key ${cacheKey}:`, error);
                    return null;
                });
            }

            if (blobExists) {
                console.log(`Cache hit for key: ${cacheKey}`);
                cacheHits++;
                audioUrls.push(blobExists.url);
                audioBuffers.push(Buffer.alloc(0)); // プレースホルダー
                continue;
            }

            // 2. キャッシュミス：TTS生成
            console.log(`Cache miss for key: ${cacheKey}`);
            cacheMisses++;
            const audioBuffer = await synthesizeToBuffer(chunkText, voiceToUse, speakingRate);

            // 音声バッファを保存
            audioBuffers.push(audioBuffer);

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

        // 旧形式（1チャンク）の場合はbase64を返す
        if (!body.chunks && body.text) {
            // 旧形式：base64レスポンス
            // audioBuffersに保存された音声データを直接base64に変換
            let audioBuffer = audioBuffers[0];

            // キャッシュヒット時はバッファが空のため、URLから音声データを取得
            if (!audioBuffer || audioBuffer.length === 0) {
                const audioUrl = audioUrls[0];
                const response = await fetch(audioUrl);

                if (!response.ok) {
                    console.error(`Failed to fetch cached audio from ${audioUrl}. Status: ${response.status}`);
                    return NextResponse.json(
                        { error: 'Failed to fetch cached audio' },
                        { status: 500, headers: corsHeaders }
                    );
                }

                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = Buffer.from(arrayBuffer);
            }

            const base64Audio = audioBuffer.toString('base64');

            return NextResponse.json({
                audio: base64Audio
            }, {
                headers: corsHeaders,
            });
        }

        // 新形式：URL配列レスポンス
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
