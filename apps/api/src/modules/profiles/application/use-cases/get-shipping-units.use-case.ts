import { Injectable } from '@nestjs/common';
import type { TGetShippingUnitsOutput } from '@zoom/schemas';
import { GetShippingUnitsUseCasePort } from '../ports/in/get-shipping-units.use-case.port';
import {
	UNIT_TYPE_CODE_DIMENSION,
	UNIT_TYPE_CODE_WEIGHT,
	UnitOfMeasureMasterRepositoryPort,
} from '../ports/out/unit-of-measure-master-repository.port';

@Injectable()
export class GetShippingUnitsUseCase implements GetShippingUnitsUseCasePort {
	constructor(private readonly unitRepo: UnitOfMeasureMasterRepositoryPort) {}

	async execute(): Promise<TGetShippingUnitsOutput> {
		const [weightUnits, dimensionUnits] = await Promise.all([
			this.unitRepo.findAllActiveByTypeCode(UNIT_TYPE_CODE_WEIGHT),
			this.unitRepo.findAllActiveByTypeCode(UNIT_TYPE_CODE_DIMENSION),
		]);

		return { weightUnits, dimensionUnits };
	}
}
