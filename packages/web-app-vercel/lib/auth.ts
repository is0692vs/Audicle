import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { initializeNewUser } from "./user-initialization";

const allowedUsers = process.env.ALLOWED_USERS?.split(',').map(email => email.trim()) || [];

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: 'select_account',
                },
            },
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
        async jwt({ token, account, profile }) {
            if (account) {
                token.id = profile?.sub || account.providerAccountId;
            }

            // 新規・既存問わず、常に初期化チェックを実行
            // initializeNewUser内で存在チェックするため、既存ユーザーはスキップされる
            await initializeNewUser(token.id as string, profile?.email || '');

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                if (typeof token.id !== 'string') {
                    throw new Error('User ID not found in token.');
                }
                session.user.id = token.id;
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },
    trustHost: true,
});