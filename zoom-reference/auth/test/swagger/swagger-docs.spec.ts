import { buildSwaggerDocument } from '@zoom/swagger';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('buildSwaggerDocument — environment gating (apps/auth)', () => {
	const originalNodeEnv = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
		vi.restoreAllMocks();
	});

	function makeApp() {
		return {
			getHttpAdapter: vi.fn().mockReturnValue({
				getInstance: vi.fn().mockReturnValue({}),
				get: vi.fn(),
				use: vi.fn(),
			}),
			get: vi.fn(),
		} as never;
	}

	it('attempts to build docs when NODE_ENV is development', () => {
		process.env.NODE_ENV = 'development';
		const app = makeApp();
		// SwaggerModule will throw on mock app — proves gating did not stop execution
		expect(() =>
			buildSwaggerDocument(app, {
				title: 'Auth Service',
				description: 'Test',
				version: '1.0',
				authType: 'both',
				apiKeyName: 'Authorization (Admin)',
			}),
		).toThrow();
	});

	it('returns without touching the app when NODE_ENV is production', () => {
		process.env.NODE_ENV = 'production';
		const app = makeApp();
		expect(() =>
			buildSwaggerDocument(app, {
				title: 'Auth Service',
				description: 'Test',
				version: '1.0',
				authType: 'both',
				apiKeyName: 'Authorization (Admin)',
			}),
		).not.toThrow();
		expect(app.getHttpAdapter).not.toHaveBeenCalled();
	});
});
