import type { TUnitOfMeasure } from '@zoom/schemas';

export const UNIT_TYPE_CODE_WEIGHT = 1;
export const UNIT_TYPE_CODE_DIMENSION = 2;

export type UnitTypeCode =
	| typeof UNIT_TYPE_CODE_WEIGHT
	| typeof UNIT_TYPE_CODE_DIMENSION;

export abstract class UnitOfMeasureMasterRepositoryPort {
	abstract findFirstActiveByTypeCode(
		typeCode: UnitTypeCode,
	): Promise<{ id: string } | null>;

	abstract findAllActiveByTypeCode(
		typeCode: UnitTypeCode,
	): Promise<TUnitOfMeasure[]>;

	abstract findActiveById(id: string): Promise<TUnitOfMeasure | null>;
}
