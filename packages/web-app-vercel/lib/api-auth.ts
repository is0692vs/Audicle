import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export type AuthResult =
    | { userEmail: string; response: null }
    | { userEmail: null; response: NextResponse };

/**
 * APIルートの認証チェックを一元管理
 * @returns userEmailと認可外の場合のNextResponse
 */
export async function requireAuth(): Promise<AuthResult> {
    const session = await auth();

    if (!session || !session.user?.email) {
        return {
            userEmail: null,
            response: NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            ),
        };
    }

    return {
        userEmail: session.user.email,
        response: null,
    };
}
