import type { TUnitOfMeasure } from '@zoom/schemas';
import type { IStructuredLogger } from '@zoom/utils';
import { describe, expect, it, vi } from 'vitest';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import { InvalidUnitOfMeasureException } from '../../domain/exceptions/invalid-unit-of-measure.exception';
import type { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import type { UnitOfMeasureMasterRepositoryPort } from '../ports/out/unit-of-measure-master-repository.port';
import {
	UNIT_TYPE_CODE_DIMENSION,
	UNIT_TYPE_CODE_WEIGHT,
} from '../ports/out/unit-of-measure-master-repository.port';
import { UpdateUserPreferencesUseCase } from './update-user-preferences.use-case';

const weightUnit: TUnitOfMeasure = {
	id: 'w-uuid',
	code: 'KG',
	name: 'Kilogram',
	unitTypeCode: UNIT_TYPE_CODE_WEIGHT,
};

const dimensionUnit: TUnitOfMeasure = {
	id: 'd-uuid',
	code: 'CM',
	name: 'Centimeter',
	unitTypeCode: UNIT_TYPE_CODE_DIMENSION,
};

const refreshedPrefs = { weightUnit, dimensionUnit };

const makeProfileRepo = (
	findResult = refreshedPrefs,
): BusinessProfileRepositoryPort => ({
	findOwnerByUserId: vi.fn(),
	findOwnerInAccount: vi.fn(),
	findActiveOrInvitedByEmail: vi.fn(),
	findCurrentUserByUserId: vi.fn(),
	findProfileDetailByUserId: vi.fn(),
	create: vi.fn(),
	findOwnerForUpdate: vi.fn(),
	updateOwnerSync: vi.fn(),
	findMemberForUpdate: vi.fn(),
	updateMember: vi.fn(),
	findPreferencesByUserId: vi.fn().mockResolvedValue(findResult),
	updatePreferencesByUserId: vi.fn(),
	createInvited: vi.fn(),
	activateByInvite: vi.fn(),
	softDeleteByInviteRejection: vi.fn(),
	updateEmail: vi.fn(),
	findCollaboratorById: vi.fn(),
	suspendCollaborator: vi.fn(),
	reactivateCollaborator: vi.fn(),
	findCollaboratorForUpdate: vi.fn(),
	updateCollaboratorById: vi.fn(),
	findProfileByUserId: vi.fn(),
	findProfileById: vi.fn(),
	removeCollaborator: vi.fn(),
	findNamesByIds: vi.fn(),
});

const makeUnitRepo = (
	units: Record<string, TUnitOfMeasure | null> = {
		'w-uuid': weightUnit,
		'd-uuid': dimensionUnit,
	},
): UnitOfMeasureMasterRepositoryPort => ({
	findFirstActiveByTypeCode: vi.fn(),
	findAllActiveByTypeCode: vi.fn(),
	findActiveById: vi
		.fn()
		.mockImplementation((id: string) => Promise.resolve(units[id] ?? null)),
});

const makeLogger = (): IStructuredLogger => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
});

describe('UpdateUserPreferencesUseCase', () => {
	it('updates weight unit only and returns refreshed preferences', async () => {
		const profileRepo = makeProfileRepo();
		const unitRepo = makeUnitRepo();
		const logger = makeLogger();
		const useCase = new UpdateUserPreferencesUseCase(
			profileRepo,
			unitRepo,
			logger,
		);

		const result = await useCase.execute('user-uuid', {
			weightUnitId: 'w-uuid',
		});

		expect(profileRepo.updatePreferencesByUserId).toHaveBeenCalledWith(
			'user-uuid',
			{ internationalMaritimeWeightUnitId: 'w-uuid' },
		);
		expect(result).toEqual(refreshedPrefs);
		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'preferences_updated',
				updatedFields: ['weightUnit'],
			}),
			expect.any(String),
		);
	});

	it('updates both weight and dimension units', async () => {
		const profileRepo = makeProfileRepo();
		const unitRepo = makeUnitRepo();
		const logger = makeLogger();
		const useCase = new UpdateUserPreferencesUseCase(
			profileRepo,
			unitRepo,
			logger,
		);

		const result = await useCase.execute('user-uuid', {
			weightUnitId: 'w-uuid',
			dimensionUnitId: 'd-uuid',
		});

		expect(profileRepo.updatePreferencesByUserId).toHaveBeenCalledWith(
			'user-uuid',
			{
				internationalMaritimeWeightUnitId: 'w-uuid',
				internationalMaritimeDimensionUnitId: 'd-uuid',
			},
		);
		expect(result).toEqual(refreshedPrefs);
	});

	it('throws InvalidUnitOfMeasureException for inactive unit', async () => {
		const profileRepo = makeProfileRepo();
		const unitRepo = makeUnitRepo({ 'w-uuid': null });
		const logger = makeLogger();
		const useCase = new UpdateUserPreferencesUseCase(
			profileRepo,
			unitRepo,
			logger,
		);

		await expect(
			useCase.execute('user-uuid', { weightUnitId: 'w-uuid' }),
		).rejects.toThrow(InvalidUnitOfMeasureException);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ event: 'preferences_update_failed' }),
			expect.any(String),
		);
	});

	it('throws InvalidUnitOfMeasureException for wrong type code', async () => {
		const profileRepo = makeProfileRepo();
		const unitRepo = makeUnitRepo({
			'd-uuid': dimensionUnit,
		});
		const logger = makeLogger();
		const useCase = new UpdateUserPreferencesUseCase(
			profileRepo,
			unitRepo,
			logger,
		);

		await expect(
			useCase.execute('user-uuid', { weightUnitId: 'd-uuid' }),
		).rejects.toThrow(InvalidUnitOfMeasureException);
	});

	it('throws BusinessProfileNotFoundException when profile not found after update', async () => {
		const profileRepo = makeProfileRepo();
		(
			profileRepo.findPreferencesByUserId as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(null);
		const unitRepo = makeUnitRepo();
		const logger = makeLogger();
		const useCase = new UpdateUserPreferencesUseCase(
			profileRepo,
			unitRepo,
			logger,
		);

		await expect(
			useCase.execute('user-uuid', { weightUnitId: 'w-uuid' }),
		).rejects.toThrow(BusinessProfileNotFoundException);
	});
});
