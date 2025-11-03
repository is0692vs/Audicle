import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedUsers = process.env.ALLOWED_USERS?.split(',').map(email => email.trim()) || [];

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            const email = user.email;
            if (!email) return false;
            const isAllowed = allowedUsers.includes(email);
            console.log('SignIn attempt:', email, 'Allowed:', isAllowed);
            return isAllowed;
        },
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },
    trustHost: true,
});