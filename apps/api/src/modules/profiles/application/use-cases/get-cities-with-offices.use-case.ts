import { Injectable } from '@nestjs/common';
import type { TGetCitiesWithOfficesOutput } from '@zoom/schemas';
import { GetCitiesWithOfficesUseCasePort } from '../ports/in/get-cities-with-offices.use-case.port';
import { OfficeMasterRepositoryPort } from '../ports/out/office-master-repository.port';

@Injectable()
export class GetCitiesWithOfficesUseCase
	implements GetCitiesWithOfficesUseCasePort
{
	constructor(private readonly officeRepo: OfficeMasterRepositoryPort) {}

	async execute(): Promise<TGetCitiesWithOfficesOutput> {
		return this.officeRepo.findDistinctActiveCities();
	}
}
