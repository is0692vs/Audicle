'use server';

import { signIn as nextAuthSignIn } from '@/lib/auth';

export async function handleGoogleSignIn() {
    await nextAuthSignIn('google', { redirectTo: '/' });
}
