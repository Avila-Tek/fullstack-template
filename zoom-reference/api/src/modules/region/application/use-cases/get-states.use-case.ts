import { Injectable } from '@nestjs/common';
import type { TStateItem } from '@zoom/schemas';
import { CountryNotFoundException } from '../../domain/exceptions/country-not-found.exception';
import { GetStatesUseCasePort } from '../ports/in/get-states.use-case.port';
import { CountryRepositoryPort } from '../ports/out/country-repository.port';
import { StateRepositoryPort } from '../ports/out/state-repository.port';

@Injectable()
export class GetStatesUseCase implements GetStatesUseCasePort {
	constructor(
		private readonly stateRepo: StateRepositoryPort,
		private readonly countryRepo: CountryRepositoryPort,
	) {}

	async execute(countryId?: string): Promise<TStateItem[]> {
		const resolvedId = await this.resolveCountryId(countryId);
		return this.stateRepo.findAllByCountryId(resolvedId);
	}

	private async resolveCountryId(countryId?: string): Promise<string> {
		const country = countryId
			? await this.countryRepo.findById(countryId)
			: await this.countryRepo.findDefault();
		if (country === null) {
			throw new CountryNotFoundException({ countryId });
		}
		return country.id;
	}
}
