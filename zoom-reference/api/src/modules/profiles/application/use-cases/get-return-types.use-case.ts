import { Injectable } from '@nestjs/common';
import type { TGetReturnTypesOutput } from '@zoom/schemas';
import {
	LEGACY_ID_DESTRUIR,
	LEGACY_ID_DEVOLVER,
} from '../../domain/constants/return-type-legacy-ids';
import { GetReturnTypesUseCasePort } from '../ports/in/get-return-types.use-case.port';
import { ReturnTypeMasterRepositoryPort } from '../ports/out/return-type-master-repository.port';

@Injectable()
export class GetReturnTypesUseCase implements GetReturnTypesUseCasePort {
	constructor(
		private readonly returnTypeRepo: ReturnTypeMasterRepositoryPort,
	) {}

	async execute(): Promise<TGetReturnTypesOutput> {
		return this.returnTypeRepo.findActiveByLegacyIds([
			LEGACY_ID_DEVOLVER,
			LEGACY_ID_DESTRUIR,
		]);
	}
}
