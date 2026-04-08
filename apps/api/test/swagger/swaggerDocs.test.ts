import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSwaggerDocument } from '@/shared/swagger/swagger';

describe('buildSwaggerDocument — environment gating (apps/api)', () => {
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
		} as unknown as {
			getHttpAdapter: ReturnType<typeof vi.fn>;
			get: ReturnType<typeof vi.fn>;
		};
	}

	it('attempts to build docs when NODE_ENV is development', () => {
		process.env.NODE_ENV = 'development';
		const app = makeApp();
		// SwaggerModule throws on a mock app — proves the production gate did not stop execution
		expect(() =>
			buildSwaggerDocument(app as never, {
				title: 'Main API',
				description: 'Test',
				version: '1.0',
				authType: 'bearer',
			}),
		).toThrow();
	});

	it('returns without touching the app when NODE_ENV is production', () => {
		process.env.NODE_ENV = 'production';
		const app = makeApp();
		expect(() =>
			buildSwaggerDocument(app as never, {
				title: 'Main API',
				description: 'Test',
				version: '1.0',
				authType: 'bearer',
			}),
		).not.toThrow();
		expect(app.getHttpAdapter).not.toHaveBeenCalled();
	});
});
