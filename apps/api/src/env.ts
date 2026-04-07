// Side-effect module — imported at the top of main.ts to validate
// all required environment variables before the NestJS container starts.

function assertEnv(key: string): void {
	if (!process.env[key]) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
}

assertEnv('DATABASE_URL');
assertEnv('BETTER_AUTH_SECRET');
assertEnv('AUTH_PUBLIC_KEY');
