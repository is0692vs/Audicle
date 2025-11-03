export { default } from 'next-auth/middleware';

export const config = {
    matcher: [
        /*
         * 以下のパスを除外:
         * - api (API routes)
         * - auth (認証ページ)
         * - _next/static (静的ファイル)
         * - _next/image (画像最適化)
         * - favicon.ico (ファビコン)
         */
        '/((?!api|auth|_next/static|_next/image|favicon.ico).*)',
    ],
};