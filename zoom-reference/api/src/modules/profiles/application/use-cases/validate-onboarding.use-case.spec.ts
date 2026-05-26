import { describe, expect, it, vi } from 'vitest';
import { BusinessIdentityConflictException } from '../../domain/exceptions/business-identity-conflict.exception';
import { DocumentTypeNotFoundException } from '../../domain/exceptions/document-type-not-found.exception';
import { PhonePrefixNotFoundException } from '../../domain/exceptions/phone-prefix-not-found.exception';
import type { BusinessAccountRepositoryPort } from '../ports/out/business-account-repository.port';
import type { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import type { DocumentTypeMasterRepositoryPort } from '../ports/out/document-type-master-repository.port';
import type { PhonePrefixMasterRepositoryPort } from '../ports/out/phone-prefix-master-repository.port';
import { ValidateOnboardingUseCase } from './validate-onboarding.use-case';

const makeCountryRepo = (id = 'country-uuid') => ({
	findById: vi.fn().mockResolvedValue({ id }),
	findDefault: vi.fn().mockResolvedValue({ id }),
});

const makeStateRepo = () => ({ findById: vi.fn().mockResolvedValue(null) });
const makeCityRepo = () => ({ findById: vi.fn().mockResolvedValue(null) });
const makeMunicipalityRepo = () => ({
	findById: vi.fn().mockResolvedValue(null),
});
const makeParishRepo = () => ({ findById: vi.fn().mockResolvedValue(null) });
const makePostalCodeRepo = () => ({
	findById: vi.fn().mockResolvedValue(null),
});

const baseInput = {
	userId: 'user-uuid',
	profile: {
		documentType: 'V',
		documentNumber: 'A12345678',
		phonePrefix: '0414',
	},
	billingAddress: {},
};

describe('ValidateOnboardingUseCase', () => {
	it('returns documentType and phonePrefix nested in profile output', async () => {
		const docTypeRepo: Pick<
			DocumentTypeMasterRepositoryPort,
			'findByCode' | 'findAll'
		> = {
			findByCode: vi.fn().mockResolvedValue({ id: 'dt-uuid', legacyId: 1 }),
			findAll: vi.fn(),
		};
		const phonePrefixRepo: Pick<
			PhonePrefixMasterRepositoryPort,
			'findByPrefix' | 'findAll'
		> = {
			findByPrefix: vi.fn().mockResolvedValue({ id: 'pp-uuid' }),
			findAll: vi.fn(),
		};
		const businessAccountRepo: Pick<
			BusinessAccountRepositoryPort,
			'existsByDocument' | 'create'
		> = {
			existsByDocument: vi.fn().mockResolvedValue(false),
			create: vi.fn(),
		};
		const businessProfileRepo: Pick<
			BusinessProfileRepositoryPort,
			'findOwnerByUserId' | 'create'
		> = {
			findOwnerByUserId: vi.fn().mockResolvedValue(null),
			create: vi.fn(),
		};

		const useCase = new ValidateOnboardingUseCase(
			docTypeRepo as DocumentTypeMasterRepositoryPort,
			phonePrefixRepo as PhonePrefixMasterRepositoryPort,
			businessAccountRepo as BusinessAccountRepositoryPort,
			businessProfileRepo as BusinessProfileRepositoryPort,
			makeCountryRepo() as never,
			makeStateRepo() as never,
			makeCityRepo() as never,
			makeMunicipalityRepo() as never,
			makeParishRepo() as never,
			makePostalCodeRepo() as never,
		);

		const result = await useCase.execute(baseInput);

		expect(result.profile.documentTypeId).toBe('dt-uuid');
		expect(result.profile.phonePrefixId).toBe('pp-uuid');
		expect(result.profile.documentType).toBe('V');
		expect(result.profile.phonePrefix).toBe('0414');
	});

	it('throws DocumentTypeNotFoundException when code not found', async () => {
		const docTypeRepo: Pick<
			DocumentTypeMasterRepositoryPort,
			'findByCode' | 'findAll'
		> = {
			findByCode: vi.fn().mockResolvedValue(null),
			findAll: vi.fn(),
		};
		const phonePrefixRepo: Pick<
			PhonePrefixMasterRepositoryPort,
			'findByPrefix' | 'findAll'
		> = {
			findByPrefix: vi.fn().mockResolvedValue({ id: 'pp-uuid' }),
			findAll: vi.fn(),
		};
		const businessAccountRepo: Pick<
			BusinessAccountRepositoryPort,
			'existsByDocument' | 'create'
		> = {
			existsByDocument: vi.fn().mockResolvedValue(false),
			create: vi.fn(),
		};
		const businessProfileRepo: Pick<
			BusinessProfileRepositoryPort,
			'findOwnerByUserId' | 'create'
		> = {
			findOwnerByUserId: vi.fn().mockResolvedValue(null),
			create: vi.fn(),
		};

		const useCase = new ValidateOnboardingUseCase(
			docTypeRepo as DocumentTypeMasterRepositoryPort,
			phonePrefixRepo as PhonePrefixMasterRepositoryPort,
			businessAccountRepo as BusinessAccountRepositoryPort,
			businessProfileRepo as BusinessProfileRepositoryPort,
			makeCountryRepo() as never,
			makeStateRepo() as never,
			makeCityRepo() as never,
			makeMunicipalityRepo() as never,
			makeParishRepo() as never,
			makePostalCodeRepo() as never,
		);

		await expect(useCase.execute(baseInput)).rejects.toThrow(
			DocumentTypeNotFoundException,
		);
	});

	it('throws PhonePrefixNotFoundException when prefix not found', async () => {
		const docTypeRepo: Pick<
			DocumentTypeMasterRepositoryPort,
			'findByCode' | 'findAll'
		> = {
			findByCode: vi.fn().mockResolvedValue({ id: 'dt-uuid', legacyId: 1 }),
			findAll: vi.fn(),
		};
		const phonePrefixRepo: Pick<
			PhonePrefixMasterRepositoryPort,
			'findByPrefix' | 'findAll'
		> = {
			findByPrefix: vi.fn().mockResolvedValue(null),
			findAll: vi.fn(),
		};
		const businessAccountRepo: Pick<
			BusinessAccountRepositoryPort,
			'existsByDocument' | 'create'
		> = {
			existsByDocument: vi.fn().mockResolvedValue(false),
			create: vi.fn(),
		};
		const businessProfileRepo: Pick<
			BusinessProfileRepositoryPort,
			'findOwnerByUserId' | 'create'
		> = {
			findOwnerByUserId: vi.fn().mockResolvedValue(null),
			create: vi.fn(),
		};

		const useCase = new ValidateOnboardingUseCase(
			docTypeRepo as DocumentTypeMasterRepositoryPort,
			phonePrefixRepo as PhonePrefixMasterRepositoryPort,
			businessAccountRepo as BusinessAccountRepositoryPort,
			businessProfileRepo as BusinessProfileRepositoryPort,
			makeCountryRepo() as never,
			makeStateRepo() as never,
			makeCityRepo() as never,
			makeMunicipalityRepo() as never,
			makeParishRepo() as never,
			makePostalCodeRepo() as never,
		);

		await expect(useCase.execute(baseInput)).rejects.toThrow(
			PhonePrefixNotFoundException,
		);
	});

	it('throws BusinessIdentityConflictException when document already exists', async () => {
		const docTypeRepo: Pick<
			DocumentTypeMasterRepositoryPort,
			'findByCode' | 'findAll'
		> = {
			findByCode: vi.fn().mockResolvedValue({ id: 'dt-uuid', legacyId: 1 }),
			findAll: vi.fn(),
		};
		const phonePrefixRepo: Pick<
			PhonePrefixMasterRepositoryPort,
			'findByPrefix' | 'findAll'
		> = {
			findByPrefix: vi.fn().mockResolvedValue({ id: 'pp-uuid' }),
			findAll: vi.fn(),
		};
		const businessAccountRepo: Pick<
			BusinessAccountRepositoryPort,
			'existsByDocument' | 'create'
		> = {
			existsByDocument: vi.fn().mockResolvedValue(true),
			create: vi.fn(),
		};
		const businessProfileRepo: Pick<
			BusinessProfileRepositoryPort,
			'findOwnerByUserId' | 'create'
		> = {
			findOwnerByUserId: vi.fn().mockResolvedValue(null),
			create: vi.fn(),
		};

		const useCase = new ValidateOnboardingUseCase(
			docTypeRepo as DocumentTypeMasterRepositoryPort,
			phonePrefixRepo as PhonePrefixMasterRepositoryPort,
			businessAccountRepo as BusinessAccountRepositoryPort,
			businessProfileRepo as BusinessProfileRepositoryPort,
			makeCountryRepo() as never,
			makeStateRepo() as never,
			makeCityRepo() as never,
			makeMunicipalityRepo() as never,
			makeParishRepo() as never,
			makePostalCodeRepo() as never,
		);

		await expect(useCase.execute(baseInput)).rejects.toThrow(
			BusinessIdentityConflictException,
		);
	});
});
