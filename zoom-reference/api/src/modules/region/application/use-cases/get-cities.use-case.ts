import { Injectable } from '@nestjs/common';
import type { TCityItem } from '@zoom/schemas';
import { GetCitiesUseCasePort } from '../ports/in/get-cities.use-case.port';
import { CityRepositoryPort } from '../ports/out/city-repository.port';

@Injectable()
export class GetCitiesUseCase implements GetCitiesUseCasePort {
	constructor(private readonly cityRepo: CityRepositoryPort) {}

	execute(stateId?: string): Promise<TCityItem[]> {
		return this.cityRepo.findAll(stateId);
	}
}
