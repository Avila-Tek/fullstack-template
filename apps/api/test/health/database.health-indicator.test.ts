import { HealthCheckError } from '@nestjs/terminus';
import { describe, expect, it, vi } from 'vitest';
import { DatabaseHealthIndicator } from '@/infrastructure/health/database.health-indicator';

const mockExecute = vi.fn();
const db = { execute: mockExecute } as never;

describe('DatabaseHealthIndicator', () => {
	const indicator = new DatabaseHealthIndicator(db);

	it('returns up status when SELECT 1 succeeds', async () => {
		mockExecute.mockResolvedValue([]);

		const result = await indicator.isHealthy('database');

		expect(result).toMatchObject({ database: { status: 'up' } });
	});

	it('throws HealthCheckError when query fails', async () => {
		mockExecute.mockRejectedValue(new Error('connection refused'));

		await expect(indicator.isHealthy('database')).rejects.toBeInstanceOf(
			HealthCheckError,
		);
	});
});
