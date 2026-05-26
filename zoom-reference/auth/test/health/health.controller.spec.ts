import { HealthCheckService } from '@nestjs/terminus';
import { describe, expect, it, vi } from 'vitest';
import { AuthHealthIndicator } from '../../src/infrastructure/health/auth.health-indicator';
import { DatabaseHealthIndicator } from '../../src/infrastructure/health/database.health-indicator';
import { HealthController } from '../../src/infrastructure/health/health.controller';
import { RedisHealthIndicator } from '../../src/infrastructure/health/redis.health-indicator';

const mockCheck = vi.fn();
const healthService = { check: mockCheck } as unknown as HealthCheckService;
const dbIndicator = {
	isHealthy: vi.fn(),
} as unknown as DatabaseHealthIndicator;
const redisIndicator = {
	isHealthy: vi.fn(),
} as unknown as RedisHealthIndicator;
const authIndicator = { isHealthy: vi.fn() } as unknown as AuthHealthIndicator;

describe('HealthController (auth)', () => {
	const controller = new HealthController(
		healthService,
		dbIndicator,
		redisIndicator,
		authIndicator,
	);

	it('liveness returns { status: "ok" }', () => {
		expect(controller.liveness()).toEqual({ status: 'ok' });
	});

	it('readiness calls health.check and returns its result', async () => {
		const expected = {
			status: 'ok',
			info: {
				database: { status: 'up' },
				redis: { status: 'up' },
				betterAuth: { status: 'up' },
			},
			error: {},
		};
		mockCheck.mockResolvedValue(expected);

		const result = await controller.readiness();

		expect(mockCheck).toHaveBeenCalledOnce();
		expect(result).toEqual(expected);
	});
});
