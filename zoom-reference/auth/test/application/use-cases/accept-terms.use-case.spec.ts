import { describe, expect, it, vi } from 'vitest';
import type { TermsRepositoryPort } from '../../../src/application/ports/out/terms-repository.port';
import type { UserTermsAcceptanceRepositoryPort } from '../../../src/application/ports/out/user-terms-acceptance-repository.port';
import { AcceptTermsUseCase } from '../../../src/application/use-cases/accept-terms.use-case';
import { TermsNoActiveVersionException } from '../../../src/domain/exceptions/terms-no-active-version.exception';

const activeTerms = {
	id: 'terms-1',
	version: 'v2.0',
	title: 'T&C',
	content: '',
	effectiveAt: new Date(),
};

function makeTermsRepo(
	overrides: Partial<TermsRepositoryPort> = {},
): TermsRepositoryPort {
	return {
		findActiveBySystemId: vi.fn().mockResolvedValue(activeTerms),
		findById: vi.fn().mockResolvedValue(null),
		...overrides,
	} as unknown as TermsRepositoryPort;
}

function makeAcceptanceRepo(
	overrides: Partial<UserTermsAcceptanceRepositoryPort> = {},
): UserTermsAcceptanceRepositoryPort {
	return {
		create: vi.fn().mockResolvedValue(undefined),
		findLatestByUserAndSystem: vi.fn().mockResolvedValue(null),
		...overrides,
	} as unknown as UserTermsAcceptanceRepositoryPort;
}

describe('AcceptTermsUseCase', () => {
	it('calls create() with the active systemTermsId and returns accepted+version', async () => {
		const acceptanceRepo = makeAcceptanceRepo();
		const useCase = new AcceptTermsUseCase(makeTermsRepo(), acceptanceRepo);

		const result = await useCase.execute({
			userId: 'u1',
			systemId: 'sys1',
			sessionId: 'sess-1',
			ipAddress: '1.2.3.4',
			userAgent: 'Mozilla/5.0',
		});

		expect(acceptanceRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({ systemTermsId: 'terms-1', userId: 'u1' }),
		);
		expect(result).toEqual({ accepted: true, version: 'v2.0' });
	});

	it('is idempotent — calling twice does not throw', async () => {
		const useCase = new AcceptTermsUseCase(
			makeTermsRepo(),
			makeAcceptanceRepo(),
		);
		const input = {
			userId: 'u1',
			systemId: 'sys1',
			sessionId: null,
			ipAddress: null,
			userAgent: null,
		};

		await expect(useCase.execute(input)).resolves.toMatchObject({
			accepted: true,
		});
		await expect(useCase.execute(input)).resolves.toMatchObject({
			accepted: true,
		});
	});

	it('throws TermsNoActiveVersionException when no active terms exist', async () => {
		const useCase = new AcceptTermsUseCase(
			makeTermsRepo({ findActiveBySystemId: vi.fn().mockResolvedValue(null) }),
			makeAcceptanceRepo(),
		);

		await expect(
			useCase.execute({
				userId: 'u1',
				systemId: 'sys1',
				sessionId: null,
				ipAddress: null,
				userAgent: null,
			}),
		).rejects.toThrow(TermsNoActiveVersionException);
	});
});
