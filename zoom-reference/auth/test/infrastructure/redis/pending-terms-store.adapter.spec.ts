import type { IStructuredLogger } from '@zoom/utils';
import type Redis from 'ioredis';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(() => ({
	PENDING_TERMS_TTL_SECONDS: 600,
}));

vi.mock('../../../src/env', () => ({ env: mockEnv }));

import type {
	PendingTermsEntry,
	PendingTermsStorePort,
} from '../../../src/application/ports/out/pending-terms-store.port';
import { RedisPendingTermsStoreAdapter } from '../../../src/infrastructure/redis/pending-terms-store.adapter';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CORRELATION_ID = 'corr-0000-0000-0000-000000000001';

const SAMPLE_ENTRY: PendingTermsEntry = {
	systemTermsId: 'terms-id-001',
	systemId: 'sys-001',
	provider: 'email',
	ipAddress: '127.0.0.1',
	userAgent: 'test-agent',
	termsAcceptedAt: '2024-01-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Redis client mock factory
// ---------------------------------------------------------------------------

function makeRedisMock() {
	return {
		set: vi.fn().mockResolvedValue('OK'),
		get: vi.fn().mockResolvedValue(null),
		del: vi.fn().mockResolvedValue(1),
		pipeline: vi.fn(),
	};
}

// ---------------------------------------------------------------------------
// Logger mock
// ---------------------------------------------------------------------------

const mockLogger: IStructuredLogger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RedisPendingTermsStoreAdapter', () => {
	let redis: ReturnType<typeof makeRedisMock>;
	let adapter: PendingTermsStorePort;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv.PENDING_TERMS_TTL_SECONDS = 600;
		redis = makeRedisMock();
		adapter = new RedisPendingTermsStoreAdapter(
			redis as unknown as Redis,
			mockLogger,
		);
	});

	// ── set() ─────────────────────────────────────────────────────────────────

	describe('set()', () => {
		it('writes a JSON-serialised entry to Redis with EX TTL', async () => {
			await adapter.set(CORRELATION_ID, SAMPLE_ENTRY);

			expect(redis.set).toHaveBeenCalledWith(
				`pending-terms:${CORRELATION_ID}`,
				JSON.stringify(SAMPLE_ENTRY),
				'EX',
				expect.any(Number),
			);
		});

		it('uses PENDING_TERMS_TTL_SECONDS env var when set', async () => {
			mockEnv.PENDING_TERMS_TTL_SECONDS = 300;
			const localAdapter = new RedisPendingTermsStoreAdapter(
				redis as unknown as Redis,
				mockLogger,
			);
			await localAdapter.set(CORRELATION_ID, SAMPLE_ENTRY);

			expect(redis.set).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				'EX',
				300,
			);
		});

		it('defaults TTL to 600 seconds when env var is absent', async () => {
			mockEnv.PENDING_TERMS_TTL_SECONDS = 600;
			const localAdapter = new RedisPendingTermsStoreAdapter(
				redis as unknown as Redis,
				mockLogger,
			);
			await localAdapter.set(CORRELATION_ID, SAMPLE_ENTRY);

			expect(redis.set).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				'EX',
				600,
			);
		});

		it('rethrows Redis errors from set()', async () => {
			redis.set.mockRejectedValue(new Error('Redis write failure'));
			await expect(adapter.set(CORRELATION_ID, SAMPLE_ENTRY)).rejects.toThrow(
				'Redis write failure',
			);
		});
	});

	// ── get() ─────────────────────────────────────────────────────────────────

	describe('get()', () => {
		it('returns the parsed entry when the key exists', async () => {
			redis.get.mockResolvedValue(JSON.stringify(SAMPLE_ENTRY));

			const result = await adapter.get(CORRELATION_ID);

			expect(result).toEqual(SAMPLE_ENTRY);
		});

		it('returns null when the key does not exist', async () => {
			redis.get.mockResolvedValue(null);

			const result = await adapter.get(CORRELATION_ID);

			expect(result).toBeNull();
		});

		it('uses the correct key pattern', async () => {
			redis.get.mockResolvedValue(JSON.stringify(SAMPLE_ENTRY));
			await adapter.get(CORRELATION_ID);
			expect(redis.get).toHaveBeenCalledWith(`pending-terms:${CORRELATION_ID}`);
		});

		it('rethrows Redis errors from get()', async () => {
			redis.get.mockRejectedValue(new Error('Redis read failure'));
			await expect(adapter.get(CORRELATION_ID)).rejects.toThrow(
				'Redis read failure',
			);
		});
	});

	// ── consume() ─────────────────────────────────────────────────────────────

	describe('consume()', () => {
		it('returns the parsed entry and deletes the key when found', async () => {
			const pipelineExec = vi.fn().mockResolvedValue([
				[null, JSON.stringify(SAMPLE_ENTRY)],
				[null, 1],
			]);
			redis.pipeline.mockReturnValue({
				get: vi.fn().mockReturnThis(),
				del: vi.fn().mockReturnThis(),
				exec: pipelineExec,
			});

			const result = await adapter.consume(CORRELATION_ID);

			expect(result).toEqual(SAMPLE_ENTRY);
		});

		it('returns null when the key does not exist (already consumed or expired)', async () => {
			const pipelineExec = vi.fn().mockResolvedValue([
				[null, null],
				[null, 0],
			]);
			redis.pipeline.mockReturnValue({
				get: vi.fn().mockReturnThis(),
				del: vi.fn().mockReturnThis(),
				exec: pipelineExec,
			});

			const result = await adapter.consume(CORRELATION_ID);

			expect(result).toBeNull();
		});

		it('does not throw when consume is called on an already-consumed key', async () => {
			const pipelineExec = vi.fn().mockResolvedValue([
				[null, null],
				[null, 0],
			]);
			redis.pipeline.mockReturnValue({
				get: vi.fn().mockReturnThis(),
				del: vi.fn().mockReturnThis(),
				exec: pipelineExec,
			});

			await expect(adapter.consume(CORRELATION_ID)).resolves.toBeNull();
		});

		it('rethrows Redis errors from consume()', async () => {
			redis.pipeline.mockReturnValue({
				get: vi.fn().mockReturnThis(),
				del: vi.fn().mockReturnThis(),
				exec: vi.fn().mockRejectedValue(new Error('Redis pipeline failure')),
			});

			await expect(adapter.consume(CORRELATION_ID)).rejects.toThrow(
				'Redis pipeline failure',
			);
		});
	});
});
