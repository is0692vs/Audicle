export { default } from 'next-auth/middleware';

export const config = {
    matcher: ['/', '/reader/:path*', '/articles/:path*'],
};