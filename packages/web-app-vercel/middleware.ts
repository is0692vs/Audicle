import { auth } from "@/lib/auth";

export default auth((req) => {
    if (!req.auth && !req.nextUrl.pathname.startsWith('/auth')) {
        const newUrl = new URL('/auth/signin', req.nextUrl.origin);
        return Response.redirect(newUrl);
    }
});

export const config = {
    matcher: ['/((?!api|auth|_next/static|_next/image|favicon.ico).*)'],
};