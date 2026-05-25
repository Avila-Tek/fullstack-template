import type { TUnitOfMeasure } from '@zoom/schemas';
import { describe, expect, it, vi } from 'vitest';
import {
	UNIT_TYPE_CODE_DIMENSION,
	UNIT_TYPE_CODE_WEIGHT,
	type UnitOfMeasureMasterRepositoryPort,
} from '../ports/out/unit-of-measure-master-repository.port';
import { GetShippingUnitsUseCase } from './get-shipping-units.use-case';

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

const makeUnitRepo = (
	weight: TUnitOfMeasure[] = [weightUnit],
	dimension: TUnitOfMeasure[] = [dimensionUnit],
): UnitOfMeasureMasterRepositoryPort => ({
	findFirstActiveByTypeCode: vi.fn(),
	findActiveById: vi.fn(),
	findAllActiveByTypeCode: vi.fn().mockImplementation((typeCode: number) => {
		if (typeCode === UNIT_TYPE_CODE_WEIGHT) return Promise.resolve(weight);
		if (typeCode === UNIT_TYPE_CODE_DIMENSION)
			return Promise.resolve(dimension);
		return Promise.resolve([]);
	}),
});

describe('GetShippingUnitsUseCase', () => {
	it('returns weight and dimension units grouped by type', async () => {
		const repo = makeUnitRepo();
		const useCase = new GetShippingUnitsUseCase(repo);

		const result = await useCase.execute();

		expect(result).toEqual({
			weightUnits: [weightUnit],
			dimensionUnits: [dimensionUnit],
		});
		expect(repo.findAllActiveByTypeCode).toHaveBeenCalledWith(
			UNIT_TYPE_CODE_WEIGHT,
		);
		expect(repo.findAllActiveByTypeCode).toHaveBeenCalledWith(
			UNIT_TYPE_CODE_DIMENSION,
		);
	});

	it('returns empty arrays when no active units exist', async () => {
		const repo = makeUnitRepo([], []);
		const useCase = new GetShippingUnitsUseCase(repo);

		const result = await useCase.execute();

		expect(result).toEqual({
			weightUnits: [],
			dimensionUnits: [],
		});
	});
});
