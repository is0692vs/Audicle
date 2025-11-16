import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
    // APIルート、認証ルート、デバッグルートはスキップ
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith('/api') || pathname.startsWith('/auth') || pathname === '/debug') {
        return NextResponse.next();
    }

    console.log('[MIDDLEWARE] Checking authentication for:', pathname)

    // 認証チェック
    const session = await auth();
    console.log('[MIDDLEWARE] Session:', session ? 'EXISTS' : 'NULL')
    console.log('[MIDDLEWARE] User ID:', session?.user?.id)
    console.log('[MIDDLEWARE] User email:', session?.user?.email)

    if (!session) {
        console.log('[MIDDLEWARE] Redirecting to signin')
        const signInUrl = new URL('/auth/signin', request.url);
        return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};