'use server';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from '@/lib/auth';

export async function handleGoogleSignIn() {
    await nextAuthSignIn('google', { 
        redirectTo: '/',
        prompt: 'select_account',
    });
}

export async function handleSignOut() {
    await nextAuthSignOut({ redirectTo: '/auth/signin' });
}
