import { describe, expect, it, vi } from 'vitest';
import { DefaultDimensionUnitNotFoundException } from '../../domain/exceptions/default-dimension-unit-not-found.exception';
import { DefaultReturnTypeNotFoundException } from '../../domain/exceptions/default-return-type-not-found.exception';
import { DefaultWeightUnitNotFoundException } from '../../domain/exceptions/default-weight-unit-not-found.exception';
import type { OnboardingUnitOfWorkPort } from '../ports/out/onboarding-unit-of-work.port';
import type { ReturnTypeMasterRepositoryPort } from '../ports/out/return-type-master-repository.port';
import type { UnitOfMeasureMasterRepositoryPort } from '../ports/out/unit-of-measure-master-repository.port';
import { PersistOnboardingUseCase } from './persist-onboarding.use-case';

const baseCommand = {
	profile: {
		userId: 'user-uuid',
		email: 'user@example.com',
		documentTypeId: 'dt-uuid',
		phonePrefixId: 'pp-uuid',
		documentType: 'V',
		phonePrefix: '0414',
		documentNumber: 'A12345678',
		legalName: 'Acme Corp',
		phoneNumber: '1234567',
	},
	billingAddress: {
		addressLine1: '123 Main St',
		countryId: 'country-uuid',
	},
	clientCode: 'CLI-001',
	clientStatus: 'active' as const,
};

const makeUnitOfMeasureRepo = (
	weightId = 'wt-uuid',
	dimId = 'dim-uuid',
): UnitOfMeasureMasterRepositoryPort => ({
	findFirstActiveByTypeCode: vi.fn().mockImplementation((code: string) => {
		if (code === 'WEIGHT') return Promise.resolve({ id: weightId });
		if (code === 'DIMENSION') return Promise.resolve({ id: dimId });
		return Promise.resolve(null);
	}),
	findAllActiveByTypeCode: vi.fn().mockResolvedValue([]),
	findActiveById: vi.fn().mockResolvedValue(null),
});

const makeReturnTypeRepo = (
	id = 'rt-uuid',
): ReturnTypeMasterRepositoryPort => ({
	findFirstActive: vi.fn().mockResolvedValue({ id }),
	findActiveById: vi.fn().mockResolvedValue(null),
	findActiveByLegacyIds: vi
		.fn()
		.mockResolvedValue([{ id, legacyId: 1, name: 'Devolución a domicilio' }]),
});

describe('PersistOnboardingUseCase', () => {
	it('calls businessAccount.create with documentType and phonePrefix', async () => {
		const addressCreate = vi.fn().mockResolvedValue({ id: 'addr-uuid' });
		const accountCreate = vi.fn().mockResolvedValue({ id: 'acct-uuid' });
		const profileCreate = vi.fn().mockResolvedValue({ id: 'prof-uuid' });
		const settingsCreate = vi.fn().mockResolvedValue({ id: 'sett-uuid' });
		const returnPrefCreate = vi.fn().mockResolvedValue({ id: 'rp-uuid' });
		const notifPrefCreate = vi.fn().mockResolvedValue(undefined);

		const unitOfWork: OnboardingUnitOfWorkPort = {
			run: vi.fn().mockImplementation(async (work) =>
				work({
					address: { create: addressCreate },
					businessAccount: { create: accountCreate, existsByDocument: vi.fn() },
					businessProfile: {
						create: profileCreate,
						findOwnerByUserId: vi.fn(),
					},
					businessProfileSettings: { create: settingsCreate },
					businessProfileReturnPreference: { create: returnPrefCreate },
					notificationPreference: { create: notifPrefCreate },
				}),
			),
		};

		const useCase = new PersistOnboardingUseCase(
			unitOfWork,
			makeUnitOfMeasureRepo(),
			makeReturnTypeRepo(),
		);

		const result = await useCase.execute(baseCommand);

		expect(result.businessAccountId).toBe('acct-uuid');
		expect(accountCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				documentType: 'V',
				phonePrefix: '0414',
			}),
		);
		expect(profileCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				documentType: 'V',
				phonePrefix: '0414',
			}),
		);
		expect(notifPrefCreate).toHaveBeenCalledWith('prof-uuid');
	});

	it('throws DefaultWeightUnitNotFoundException when no weight unit found', async () => {
		const unitOfWork: OnboardingUnitOfWorkPort = {
			run: vi.fn(),
		};
		const uomRepo: UnitOfMeasureMasterRepositoryPort = {
			findFirstActiveByTypeCode: vi.fn().mockResolvedValue(null),
			findAllActiveByTypeCode: vi.fn().mockResolvedValue([]),
			findActiveById: vi.fn().mockResolvedValue(null),
		};

		const useCase = new PersistOnboardingUseCase(
			unitOfWork,
			uomRepo,
			makeReturnTypeRepo(),
		);

		await expect(useCase.execute(baseCommand)).rejects.toThrow(
			DefaultWeightUnitNotFoundException,
		);
	});

	it('throws DefaultDimensionUnitNotFoundException when no dimension unit found', async () => {
		const unitOfWork: OnboardingUnitOfWorkPort = {
			run: vi.fn(),
		};
		const uomRepo: UnitOfMeasureMasterRepositoryPort = {
			findFirstActiveByTypeCode: vi.fn().mockImplementation((code: string) => {
				if (code === 'WEIGHT') return Promise.resolve({ id: 'wt-uuid' });
				return Promise.resolve(null);
			}),
			findAllActiveByTypeCode: vi.fn().mockResolvedValue([]),
			findActiveById: vi.fn().mockResolvedValue(null),
		};

		const useCase = new PersistOnboardingUseCase(
			unitOfWork,
			uomRepo,
			makeReturnTypeRepo(),
		);

		await expect(useCase.execute(baseCommand)).rejects.toThrow(
			DefaultDimensionUnitNotFoundException,
		);
	});

	it('throws DefaultReturnTypeNotFoundException when no return type found', async () => {
		const unitOfWork: OnboardingUnitOfWorkPort = {
			run: vi.fn(),
		};
		const returnTypeRepo: ReturnTypeMasterRepositoryPort = {
			findFirstActive: vi.fn().mockResolvedValue(null),
			findActiveById: vi.fn().mockResolvedValue(null),
			findActiveByLegacyIds: vi.fn().mockResolvedValue([]),
		};

		const useCase = new PersistOnboardingUseCase(
			unitOfWork,
			makeUnitOfMeasureRepo(),
			returnTypeRepo,
		);

		await expect(useCase.execute(baseCommand)).rejects.toThrow(
			DefaultReturnTypeNotFoundException,
		);
	});
});
