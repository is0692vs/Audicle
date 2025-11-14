import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getKv } from '@/lib/kv';
import { parseArticleMetadata, serializeArticleMetadata } from '@/lib/kv-helpers';
import { CacheStats, SynthesizeChunk } from '@/types/api';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { getCacheIndex, addCachedChunk, isCachedInIndex } from '@/lib/db/cacheIndex';
import { calculateTextHash } from '@/lib/textHash';
import { getStorageProvider } from '@/lib/storage';

// Node.js runtimeを明示的に指定（Google Cloud TTS SDKはEdge Runtimeで動作しない）
export const runtime = 'nodejs';
// 動的レンダリングを強制（キャッシュを無効化）
export const dynamic = 'force-dynamic';

// 許可リスト（環境変数から取得、カンマ区切り）
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split(',').map(e => e.trim()) || [];

// 人気記事判定の閾値（本番環境では5以上に調整することを推奨）
// 現在は2に設定して開発/テスト環境での最適化検証を行う
const POPULAR_ARTICLE_READ_COUNT_THRESHOLD = 2;

// 記事ハッシュ計算関数を追加
function calculateArticleHash(chunks: string[]): string {
    const content = chunks.join('\n');
    return calculateTextHash(content).substring(0, 16);
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
        const storage = getStorageProvider();
        const signedUrlTtlSeconds = 60 * 60;

        // 旧形式（text + voiceModel）または新形式（chunks + voice）の両方をサポート
        const textChunks = body.chunks
            ? body.chunks.map((c: SynthesizeChunk) => c.text)
            : [body.text];

        const voiceToUse = body.voice || body.voice_model || 'ja-JP-Standard-B';
        const { articleUrl, chunks, chunkIndex } = body;

        // 記事メタデータ処理
        let isPopularArticle = false;
        let metadata = null;
        const kv = await getKv();

        if (kv) {
            const metadataKey = `article:${articleUrl}:${voiceToUse}`;

            // ステップ1: 記事レベルのメタデータ（body.chunks存在時のみ）
            if (articleUrl && chunks && Array.isArray(chunks)) {
                const currentHash = calculateArticleHash(textChunks);
                const totalChunks = textChunks.length;

                try {
                    // 既存メタデータを確認
                    const metadataHash = await kv.hgetall(metadataKey);
                    metadata = parseArticleMetadata(metadataHash);

                    // 新規 or 記事編集時のみハッシュ/totalChunksを保存
                    if (!metadata || metadata.articleHash !== currentHash) {
                        await kv.hset(metadataKey, serializeArticleMetadata({
                            articleUrl,
                            articleHash: currentHash,
                            voice: voiceToUse,
                            totalChunks,
                            completedPlayback: false,
                            readCount: 0,
                            lastUpdated: new Date().toISOString(),
                            lastAccessed: new Date().toISOString()
                        }));
                        console.log(`[INFO] ✅ Article metadata initialized: ${articleUrl} (${totalChunks} chunks)`);
                    }
                } catch (kvError) {
                    console.error('[ERROR] ❌ Failed to initialize article metadata:', kvError);
                }
            }

            // ステップ2: アクセスレベルのメタデータ（articleUrl存在時は常に）
            if (articleUrl) {
                try {
                    // アクセスメタデータを取得（人気記事判定用）
                    const metadataHash = await kv.hgetall(metadataKey);
                    metadata = parseArticleMetadata(metadataHash);

                    // 人気記事判定（記事レベルメタデータから）
                    if (metadata && metadata.readCount >= POPULAR_ARTICLE_READ_COUNT_THRESHOLD && metadata.completedPlayback === true) {
                        isPopularArticle = true;
                        console.log('[Optimize] ⚡ Popular article detected:', {
                            articleUrl,
                            readCount: metadata.readCount,
                            completedPlayback: metadata.completedPlayback,
                            threshold: POPULAR_ARTICLE_READ_COUNT_THRESHOLD
                        });
                    }

                    // アクセスカウントと最終アクセス時刻を更新
                    await kv.hincrby(metadataKey, 'readCount', 1);
                    await kv.hset(metadataKey, {
                        lastAccessed: new Date().toISOString(),
                        lastPlayedChunk: chunkIndex ?? 0
                    });
                    console.log(`[INFO] ✅ Access metadata updated: ${articleUrl}`);
                } catch (kvError) {
                    console.error('[ERROR] ❌ Failed to update access metadata:', kvError);
                }
            }
        }

        // デバッグログ: 人気記事判定結果
        console.log('[Optimize] Article metadata:', {
            articleUrl,
            readCount: metadata?.readCount ?? 0,
            completedPlayback: metadata?.completedPlayback ?? false,
            isPopular: isPopularArticle
        });

        // Supabaseキャッシュインデックスを取得（articleUrlがある場合）
        let cacheIndex = null;
        if (articleUrl) {
            try {
                cacheIndex = await getCacheIndex(articleUrl, voiceToUse);
                console.log('[Supabase Index] Cache index loaded:', {
                    articleUrl,
                    voice: voiceToUse,
                    cachedChunksCount: cacheIndex?.cached_chunks.length ?? 0
                });
            } catch {
                // getCacheIndex関数内で既にエラーログが出力されているため、ここではログ出力しない
            }
        }

        // キャッシュ統計情報
        let cacheHits = 0;
        let cacheMisses = 0;

        // 各チャンクを合成またはキャッシュから取得
        const audioUrls: string[] = [];
        const audioBuffers: Buffer[] = [];

        // Simple Operations 削減カウンター
        let headOperationsSkipped = 0;

        for (const chunkText of textChunks) {
            const textHash = calculateTextHash(chunkText);
            const cacheKey = `${textHash}:${voiceToUse}.mp3`;
            const isCachedByIndex = cacheIndex ? isCachedInIndex(cacheIndex, textHash) : false;

            const recordCachedHit = async (): Promise<boolean> => {
                try {
                    const url = await storage.generatePresignedGetUrl(cacheKey, signedUrlTtlSeconds);
                    cacheHits++;
                    audioUrls.push(url);
                    audioBuffers.push(Buffer.alloc(0));
                    return true;
                } catch (urlError) {
                    console.warn('[Storage] ⚠️ Failed to issue presigned GET URL:', {
                        cacheKey,
                        error: urlError instanceof Error ? urlError.message : urlError,
                    });
                    return false;
                }
            };

            let headChecked = false;
            let objectExists = false;

            const checkWithHead = async (): Promise<void> => {
                if (headChecked) {
                    return;
                }
                headChecked = true;
                const result = await storage.headObject(cacheKey).catch((error) => {
                    console.error(`Failed to check cache for key ${cacheKey}:`, error);
                    return null;
                });
                objectExists = result?.exists ?? false;
            };

            // 人気記事の場合：全チャンクがキャッシュ済みと仮定してhead()をスキップ
            if (isPopularArticle) {
                console.log(`[Optimize] ⚡ Popular article: skipping head() for chunk ${audioUrls.length + 1}`);
                headOperationsSkipped++;

                const hitRecorded = await recordCachedHit();
                if (hitRecorded) {
                    continue;
                }

                console.warn('[Optimize] ⚠️ Popular article presigned URL failed, falling back to normal flow');
            }

            if (cacheIndex) {
                if (isCachedByIndex) {
                    // Supabaseインデックスにキャッシュ済み → head()スキップ！
                    console.log('[Supabase Index] ⚡ Cache hit, skipping head() for key:', cacheKey);
                    headOperationsSkipped++;

                    const hitRecorded = await recordCachedHit();
                    if (hitRecorded) {
                        continue;
                    }

                    console.warn('[Supabase Index] ⚠️ Presigned URL failed, falling back to head() check');
                    await checkWithHead();
                    if (objectExists) {
                        const fallbackHit = await recordCachedHit();
                        if (fallbackHit) {
                            continue;
                        }
                    }
                } else {
                    // Supabaseインデックスになし → キャッシュミス確定
                    console.log('[Supabase Index] ❌ Cache miss for key:', cacheKey);
                }
            }

            // 通常フロー or Supabaseインデックスなし or ミス → head()でチェック
            if (!cacheIndex || !isCachedByIndex) {
                console.log('[Optimize] 🔍 Checking with head() for key:', cacheKey);
                await checkWithHead();
            }

            if (objectExists) {
                console.log(`Cache hit for key: ${cacheKey}`);

                const hitRecorded = await recordCachedHit();
                if (hitRecorded) {
                    // インデックスにはないが Blob に存在する場合：遅延インデックス作成
                    if (articleUrl && cacheIndex && !isCachedByIndex) {
                        addCachedChunk(articleUrl, voiceToUse, textHash)
                            .then(() => {
                                console.log('[Supabase Index] 🔄 Backfilling index for existing cache:', textHash);
                            })
                            .catch((error) => {
                                console.error('[Supabase Index] ❌ Failed to backfill index:', textHash, error);
                            });
                    }

                    continue;
                }
            }

            // 2. キャッシュミス：TTS生成
            console.log(`Cache miss for key: ${cacheKey}`);
            cacheMisses++;
            const audioBuffer = await synthesizeToBuffer(chunkText, voiceToUse, speakingRate);

            // 音声バッファを保存
            audioBuffers.push(audioBuffer);

            // 3. ストレージに保存（失敗時はbase64にフォールバック）
            try {
                const uploadUrl = await storage.generatePresignedPutUrl(cacheKey, signedUrlTtlSeconds);
                const uploadResponse = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: audioBuffer,
                    headers: { 'Content-Type': 'audio/mpeg' },
                });

                if (!uploadResponse.ok) {
                    throw new Error(`Failed to upload audio. Status: ${uploadResponse.status}`);
                }

                const storedUrl = await storage.generatePresignedGetUrl(cacheKey, signedUrlTtlSeconds);
                audioUrls.push(storedUrl);

                // 4. Supabaseインデックスに追加（articleUrlがある場合）
                if (articleUrl) {
                    try {
                        await addCachedChunk(articleUrl, voiceToUse, textHash);
                        console.log('[Supabase Index] ✅ Chunk added to index:', textHash);
                    } catch {
                        // addCachedChunk関数内で既にエラーログが出力されているため、ここではログ出力しない
                    }
                }
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
        console.log(`[Optimize] ⚡ Simple Operations saved: ${headOperationsSkipped} head() calls skipped`);

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
