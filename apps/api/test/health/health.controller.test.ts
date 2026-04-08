import { HealthCheckService } from '@nestjs/terminus';
import { describe, expect, it, vi } from 'vitest';
import { DatabaseHealthIndicator } from '@/infrastructure/health/database.health-indicator';
import { HealthController } from '@/infrastructure/health/health.controller';

const mockHealthCheck = vi.fn();
const mockDbIsHealthy = vi.fn();

const healthService = {
	check: mockHealthCheck,
} as unknown as HealthCheckService;

const dbIndicator = {
	isHealthy: mockDbIsHealthy,
} as unknown as DatabaseHealthIndicator;

describe('HealthController', () => {
	const controller = new HealthController(healthService, dbIndicator);

	it('liveness returns { status: "ok" }', () => {
		expect(controller.liveness()).toEqual({ status: 'ok' });
	});

	it('readiness delegates to HealthCheckService with db indicator', async () => {
		const expected = {
			status: 'ok',
			info: { database: { status: 'up' } },
			error: {},
		};
		mockHealthCheck.mockResolvedValue(expected);

		const result = await controller.readiness();

		expect(mockHealthCheck).toHaveBeenCalledOnce();
		expect(result).toEqual(expected);
	});
});
