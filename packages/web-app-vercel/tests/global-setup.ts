import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup() {
    if (process.env.SKIP_SEED === 'true') {
        console.log('[GLOBAL SETUP] Skipping test data seeding (SKIP_SEED=true)');
        return;
    }

    console.log('[GLOBAL SETUP] Starting test data seeding...');

    try {
        execSync('npm run seed-test-data', {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'inherit',
            env: { ...process.env, NODE_ENV: 'test' }
        });

        console.log('[GLOBAL SETUP] Test data seeding completed successfully');
    } catch (error) {
        console.error('[GLOBAL SETUP] Failed to seed test data:', error);
        throw error;
    }
}