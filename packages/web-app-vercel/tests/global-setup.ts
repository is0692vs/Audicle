import { execSync } from 'child_process';
import path from 'path';

async function globalSetup() {
    console.log('[GLOBAL SETUP] Starting test data seeding...');

    try {
        // Run the seed script
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

export default globalSetup;