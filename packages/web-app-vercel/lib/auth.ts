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
                // 新規ユーザーの場合、初期化処理を実行
                await initializeNewUser(token.id as string);
            }
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