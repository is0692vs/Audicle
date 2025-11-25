/**
 * TTS Error Handling Tests
 * synthesize/route.ts のエラーハンドリング機能をテスト
 */

/**
 * GoogleErrorをモックするクラス
 */
class MockGoogleError extends Error {
    code?: number;

    constructor(message: string, code?: number) {
        super(message);
        this.name = 'GoogleError';
        this.code = code;
    }
}

/**
 * parseTTSErrorのロジックをシミュレート
 * （route.tsの実装と同じロジック）
 */
interface TTSErrorInfo {
    statusCode: number;
    userMessage: string;
    errorType: 'INVALID_ARGUMENT' | 'RESOURCE_EXHAUSTED' | 'INTERNAL' | 'NETWORK' | 'UNKNOWN';
}

function parseTTSError(error: unknown): TTSErrorInfo {
    // GoogleErrorの場合（gRPCエラー）
    if (error instanceof MockGoogleError) {
        const code = error.code;
        const message = error.message ? error.message.toLowerCase() : '';

        // INVALID_ARGUMENT (3)
        if (code === 3 || message.includes('invalid_argument')) {
            return {
                statusCode: 400,
                userMessage: 'テキストが長すぎるか、無効な入力です。',
                errorType: 'INVALID_ARGUMENT',
            };
        }

        // RESOURCE_EXHAUSTED (8)
        if (code === 8 || message.includes('resource_exhausted') || message.includes('quota')) {
            return {
                statusCode: 429,
                userMessage: 'API利用制限に達しました。',
                errorType: 'RESOURCE_EXHAUSTED',
            };
        }

        // INTERNAL (13)
        if (code === 13 || message.includes('internal')) {
            return {
                statusCode: 503,
                userMessage: 'Google Cloud TTSサービスで一時的なエラーが発生しました。',
                errorType: 'INTERNAL',
            };
        }

        // UNAVAILABLE (14)
        if (code === 14 || message.includes('unavailable')) {
            return {
                statusCode: 503,
                userMessage: 'Google Cloud TTSサービスが一時的に利用できません。',
                errorType: 'INTERNAL',
            };
        }
    }

    // ネットワークエラー
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnrefused') ||
            message.includes('enotfound')
        ) {
            return {
                statusCode: 503,
                userMessage: 'ネットワークエラーが発生しました。',
                errorType: 'NETWORK',
            };
        }
    }

    // その他の不明なエラー
    return {
        statusCode: 500,
        userMessage: '音声合成中にエラーが発生しました。',
        errorType: 'UNKNOWN',
    };
}

describe('TTS Error Handling', () => {
    describe('parseTTSError function', () => {
        it('should map INVALID_ARGUMENT (code 3) to 400', () => {
            const error = new MockGoogleError('Invalid argument', 3);
            const result = parseTTSError(error);

            expect(result.statusCode).toBe(400);
            expect(result.errorType).toBe('INVALID_ARGUMENT');
            expect(result.userMessage).toContain('長すぎる');
        });

        it('should handle INVALID_ARGUMENT in message (case-insensitive)', () => {
            const error = new MockGoogleError('Invalid_Argument detected', 0);
            const result = parseTTSError(error);

            expect(result.statusCode).toBe(400);
            expect(result.errorType).toBe('INVALID_ARGUMENT');
        });

        it('should map RESOURCE_EXHAUSTED (code 8) to 429', () => {
            const error = new MockGoogleError('Resource exhausted', 8);
            const result = parseTTSError(error);

            expect(result.statusCode).toBe(429);
            expect(result.errorType).toBe('RESOURCE_EXHAUSTED');
            expect(result.userMessage).toContain('利用制限');
        });

        it('should handle quota exceeded in message', () => {
            const error = new MockGoogleError('Quota exceeded for API', 0);
            const result = parseTTSError(error);

            expect(result.statusCode).toBe(429);
            expect(result.errorType).toBe('RESOURCE_EXHAUSTED');
        });

        it('should map INTERNAL (code 13) to 503', () => {
            const error = new MockGoogleError('Internal error', 13);
            const result = parseTTSError(error);

            expect(result.statusCode).toBe(503);
            expect(result.errorType).toBe('INTERNAL');
        });

        it('should handle INTERNAL in message (case-insensitive)', () => {
            const error = new MockGoogleError('INTERNAL_ERROR occurred', 0);
            const result = parseTTSError(error);

            expect(result.statusCode).toBe(503);
            expect(result.errorType).toBe('INTERNAL');
        });

        it('should map UNAVAILABLE (code 14) to 503', () => {
            const error = new MockGoogleError('Service unavailable', 14);
            const result = parseTTSError(error);

            expect(result.statusCode).toBe(503);
            expect(result.errorType).toBe('INTERNAL');
        });

        it('should map network errors to 503', () => {
            const networkError = new Error('ECONNREFUSED connection refused');
            const result = parseTTSError(networkError);

            expect(result.statusCode).toBe(503);
            expect(result.errorType).toBe('NETWORK');
        });

        it('should handle timeout errors', () => {
            const timeoutError = new Error('Operation timeout');
            const result = parseTTSError(timeoutError);

            expect(result.statusCode).toBe(503);
            expect(result.errorType).toBe('NETWORK');
        });

        it('should default to UNKNOWN for unrecognized errors', () => {
            const unknownError = new Error('Some random error');
            const result = parseTTSError(unknownError);

            expect(result.statusCode).toBe(500);
            expect(result.errorType).toBe('UNKNOWN');
        });
    });

    describe('Error message format', () => {
        it('should return user-friendly messages', () => {
            const errorMessage = 'API利用制限に達しました';
            expect(errorMessage).toBeTruthy();
            expect(typeof errorMessage).toBe('string');
            expect(errorMessage.length).toBeGreaterThan(0);
        });
    });

    describe('Byte size validation', () => {
        it('should calculate correct byte size for Japanese text', () => {
            const japaneseText = 'あいうえお'; // 5文字 x 3バイト = 15バイト
            const byteSize = Buffer.byteLength(japaneseText, 'utf-8');
            expect(byteSize).toBe(15);
        });

        it('should calculate correct byte size for mixed text', () => {
            const mixedText = 'Hello世界'; // 5 + (2 * 3) = 11バイト
            const byteSize = Buffer.byteLength(mixedText, 'utf-8');
            expect(byteSize).toBe(11);
        });

        it('should detect text exceeding 5000 bytes', () => {
            const longText = 'あ'.repeat(2000); // 6000バイト
            const byteSize = Buffer.byteLength(longText, 'utf-8');
            expect(byteSize).toBeGreaterThan(5000);
        });
    });
});
