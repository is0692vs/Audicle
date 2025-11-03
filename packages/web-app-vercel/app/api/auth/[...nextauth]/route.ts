import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedUsers = process.env.ALLOWED_USERS?.split(',') || [];

const handler = NextAuth({
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
            return allowedUsers.includes(email);
        },
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },
});

export { handler as GET, handler as POST };