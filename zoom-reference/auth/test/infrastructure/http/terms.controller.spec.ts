import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveTermsRecord } from '../../../src/application/ports/out/terms-repository.port';
import { TermsController } from '../../../src/infrastructure/http/terms.controller';

const mockFindActiveBySystemId = vi.fn();
const mockGetStatusExecute = vi.fn();
const mockAcceptExecute = vi.fn();

const termsRepo = { findActiveBySystemId: mockFindActiveBySystemId };
const getStatusUseCase = { execute: mockGetStatusExecute };
const acceptUseCase = { execute: mockAcceptExecute };

const ACTIVE_TERMS: ActiveTermsRecord = {
	id: '550e8400-e29b-41d4-a716-446655440000',
	version: 'v1.0',
	title: 'Terms of Service',
	content: '<p>Terms of Service</p>',
	effectiveAt: new Date('2024-01-01T00:00:00.000Z'),
};

const AUTH_USER = { id: 'user-abc', sessionId: 'session-xyz' };

function makeReq(overrides: Record<string, unknown> = {}) {
	return {
		systemContext: { systemId: 'system-123' },
		headers: { 'user-agent': 'TestAgent/1.0', 'x-forwarded-for': '10.0.0.1' },
		socket: { remoteAddress: '10.0.0.1' },
		...overrides,
	} as never;
}

describe('TermsController', () => {
	let controller: TermsController;

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new TermsController(
			termsRepo as never,
			getStatusUseCase as never,
			acceptUseCase as never,
		);
	});

	// ── GET /terms/active ────────────────────────────────────────────────────

	it('returns active terms when systemId is present and terms exist', async () => {
		mockFindActiveBySystemId.mockResolvedValue(ACTIVE_TERMS);

		const result = await controller.getActiveTerms(makeReq());

		expect(mockFindActiveBySystemId).toHaveBeenCalledWith('system-123');
		expect(result).toEqual({
			id: ACTIVE_TERMS.id,
			version: ACTIVE_TERMS.version,
			title: ACTIVE_TERMS.title,
			content: ACTIVE_TERMS.content,
			effectiveAt: ACTIVE_TERMS.effectiveAt,
		});
	});

	it('throws NotFoundException when no active terms exist for systemId', async () => {
		mockFindActiveBySystemId.mockResolvedValue(null);

		await expect(controller.getActiveTerms(makeReq())).rejects.toThrow(
			NotFoundException,
		);
	});

	it('throws UnauthorizedException when systemId is missing from request', async () => {
		await expect(
			controller.getActiveTerms({ systemContext: undefined } as never),
		).rejects.toThrow(UnauthorizedException);

		expect(mockFindActiveBySystemId).not.toHaveBeenCalled();
	});

	// ── GET /terms/acceptance/status ─────────────────────────────────────────

	describe('getAcceptanceStatus', () => {
		it('delegates to use case with correct userId and systemId', async () => {
			const expected = {
				requiresAcceptance: true,
				activeVersion: 'v1.0',
				acceptedVersion: null,
			};
			mockGetStatusExecute.mockResolvedValue(expected);

			const result = await controller.getAcceptanceStatus(AUTH_USER, makeReq());

			expect(mockGetStatusExecute).toHaveBeenCalledWith({
				userId: AUTH_USER.id,
				systemId: 'system-123',
			});
			expect(result).toEqual(expected);
		});

		it('throws UnauthorizedException when systemContext is missing', async () => {
			await expect(
				controller.getAcceptanceStatus(AUTH_USER, {
					systemContext: undefined,
					headers: {},
				} as never),
			).rejects.toThrow(UnauthorizedException);

			expect(mockGetStatusExecute).not.toHaveBeenCalled();
		});
	});

	// ── POST /terms/acceptance ────────────────────────────────────────────────

	describe('acceptTerms', () => {
		it('delegates to use case with userId, systemId, sessionId, ip, and userAgent', async () => {
			const expected = { accepted: true as const, version: 'v1.0' };
			mockAcceptExecute.mockResolvedValue(expected);

			const result = await controller.acceptTerms(AUTH_USER, makeReq());

			expect(mockAcceptExecute).toHaveBeenCalledWith({
				userId: AUTH_USER.id,
				systemId: 'system-123',
				sessionId: AUTH_USER.sessionId,
				ipAddress: '10.0.0.1',
				userAgent: 'TestAgent/1.0',
			});
			expect(result).toEqual(expected);
		});

		it('throws UnauthorizedException when systemContext is missing', async () => {
			await expect(
				controller.acceptTerms(AUTH_USER, {
					systemContext: undefined,
					headers: {},
				} as never),
			).rejects.toThrow(UnauthorizedException);

			expect(mockAcceptExecute).not.toHaveBeenCalled();
		});

		it('passes null userAgent when header is absent', async () => {
			mockAcceptExecute.mockResolvedValue({
				accepted: true as const,
				version: 'v1.0',
			});

			await controller.acceptTerms(
				AUTH_USER,
				makeReq({ headers: { 'x-forwarded-for': '10.0.0.1' } }),
			);

			expect(mockAcceptExecute).toHaveBeenCalledWith(
				expect.objectContaining({ userAgent: null }),
			);
		});
	});
});
