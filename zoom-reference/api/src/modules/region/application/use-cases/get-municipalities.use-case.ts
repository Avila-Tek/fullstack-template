import { Injectable } from '@nestjs/common';
import type { TMunicipalityItem } from '@zoom/schemas';
import { GetMunicipalitiesUseCasePort } from '../ports/in/get-municipalities.use-case.port';
import { MunicipalityRepositoryPort } from '../ports/out/municipality-repository.port';

@Injectable()
export class GetMunicipalitiesUseCase implements GetMunicipalitiesUseCasePort {
	constructor(private readonly municipalityRepo: MunicipalityRepositoryPort) {}

	execute(stateId: string): Promise<TMunicipalityItem[]> {
		return this.municipalityRepo.findAllByStateId(stateId);
	}
}
