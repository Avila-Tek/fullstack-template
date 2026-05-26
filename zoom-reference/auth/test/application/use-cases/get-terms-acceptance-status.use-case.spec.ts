import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TermsRepositoryPort } from '../../../src/application/ports/out/terms-repository.port';
import type { UserTermsAcceptanceRepositoryPort } from '../../../src/application/ports/out/user-terms-acceptance-repository.port';
import { GetTermsAcceptanceStatusUseCase } from '../../../src/application/use-cases/get-terms-acceptance-status.use-case';

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
		findActiveBySystemId: vi.fn().mockResolvedValue(null),
		findById: vi.fn().mockResolvedValue(null),
		...overrides,
	} as unknown as TermsRepositoryPort;
}

function makeAcceptanceRepo(
	overrides: Partial<UserTermsAcceptanceRepositoryPort> = {},
): UserTermsAcceptanceRepositoryPort {
	return {
		create: vi.fn(),
		findLatestByUserAndSystem: vi.fn().mockResolvedValue(null),
		...overrides,
	} as unknown as UserTermsAcceptanceRepositoryPort;
}

describe('GetTermsAcceptanceStatusUseCase', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns requiresAcceptance=false when no active terms exist', async () => {
		const useCase = new GetTermsAcceptanceStatusUseCase(
			makeTermsRepo({ findActiveBySystemId: vi.fn().mockResolvedValue(null) }),
			makeAcceptanceRepo(),
		);

		const result = await useCase.execute({ userId: 'u1', systemId: 'sys1' });

		expect(result).toEqual({
			requiresAcceptance: false,
			activeVersion: null,
			acceptedVersion: null,
		});
	});

	it('returns requiresAcceptance=true when user has never accepted', async () => {
		const useCase = new GetTermsAcceptanceStatusUseCase(
			makeTermsRepo({
				findActiveBySystemId: vi.fn().mockResolvedValue(activeTerms),
			}),
			makeAcceptanceRepo({
				findLatestByUserAndSystem: vi.fn().mockResolvedValue(null),
			}),
		);

		const result = await useCase.execute({ userId: 'u1', systemId: 'sys1' });

		expect(result.requiresAcceptance).toBe(true);
		expect(result.activeVersion).toBe('v2.0');
		expect(result.acceptedVersion).toBeNull();
	});

	it('returns requiresAcceptance=true when accepted version differs from active', async () => {
		const termsRepo = makeTermsRepo({
			findActiveBySystemId: vi.fn().mockResolvedValue(activeTerms),
			findById: vi.fn().mockResolvedValue({ id: 'terms-old', version: 'v1.0' }),
		});
		const acceptanceRepo = makeAcceptanceRepo({
			findLatestByUserAndSystem: vi.fn().mockResolvedValue({
				systemTermsId: 'terms-old',
				acceptedAt: new Date(),
			}),
		});
		const useCase = new GetTermsAcceptanceStatusUseCase(
			termsRepo,
			acceptanceRepo,
		);

		const result = await useCase.execute({ userId: 'u1', systemId: 'sys1' });

		expect(result.requiresAcceptance).toBe(true);
		expect(result.acceptedVersion).toBe('v1.0');
	});

	it('returns requiresAcceptance=false when accepted version matches active', async () => {
		const termsRepo = makeTermsRepo({
			findActiveBySystemId: vi.fn().mockResolvedValue(activeTerms),
			findById: vi.fn().mockResolvedValue({ id: 'terms-1', version: 'v2.0' }),
		});
		const acceptanceRepo = makeAcceptanceRepo({
			findLatestByUserAndSystem: vi.fn().mockResolvedValue({
				systemTermsId: 'terms-1',
				acceptedAt: new Date(),
			}),
		});
		const useCase = new GetTermsAcceptanceStatusUseCase(
			termsRepo,
			acceptanceRepo,
		);

		const result = await useCase.execute({ userId: 'u1', systemId: 'sys1' });

		expect(result.requiresAcceptance).toBe(false);
		expect(result.acceptedVersion).toBe('v2.0');
	});
});
