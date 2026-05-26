import type { TUnitOfMeasure } from '@zoom/schemas';
import type { IStructuredLogger } from '@zoom/utils';
import { describe, expect, it, vi } from 'vitest';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import type {
	BusinessProfileRepositoryPort,
	UserPreferencesRecord,
} from '../ports/out/business-profile-repository.port';
import {
	UNIT_TYPE_CODE_DIMENSION,
	UNIT_TYPE_CODE_WEIGHT,
} from '../ports/out/unit-of-measure-master-repository.port';
import { GetUserPreferencesUseCase } from './get-user-preferences.use-case';

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

const preferences: UserPreferencesRecord = {
	weightUnit,
	dimensionUnit,
};

const makeProfileRepo = (
	prefs: UserPreferencesRecord | null = preferences,
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
	findPreferencesByUserId: vi.fn().mockResolvedValue(prefs),
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

const makeLogger = (): IStructuredLogger => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
});

describe('GetUserPreferencesUseCase', () => {
	it('returns weight and dimension unit preferences', async () => {
		const repo = makeProfileRepo();
		const logger = makeLogger();
		const useCase = new GetUserPreferencesUseCase(repo, logger);

		const result = await useCase.execute('user-uuid');

		expect(result).toEqual({
			weightUnit,
			dimensionUnit,
		});
		expect(repo.findPreferencesByUserId).toHaveBeenCalledWith('user-uuid');
		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({ event: 'preferences_loaded' }),
			expect.any(String),
		);
	});

	it('throws BusinessProfileNotFoundException when no profile exists', async () => {
		const repo = makeProfileRepo(null);
		const logger = makeLogger();
		const useCase = new GetUserPreferencesUseCase(repo, logger);

		await expect(useCase.execute('user-uuid')).rejects.toThrow(
			BusinessProfileNotFoundException,
		);
		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ event: 'preferences_load_failed' }),
			expect.any(String),
		);
	});
});
