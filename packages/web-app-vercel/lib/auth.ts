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
            if (!email) {
                throw new Error('NO_EMAIL: メールアドレスが取得できませんでした');
            }
            const isAllowed = allowedUsers.includes(email);
            console.log('SignIn attempt:', email, 'Allowed:', isAllowed, 'AllowedUsers:', allowedUsers);

            if (!isAllowed) {
                // エラーメッセージをURLパラメータで渡す
                const errorMessage = `ACCESS_DENIED: ${email}`;
                throw new Error(errorMessage);
            }
            return true;
        },
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },
    trustHost: true,
});