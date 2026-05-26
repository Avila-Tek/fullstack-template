import { Injectable } from '@nestjs/common';
import type { TParishItem } from '@zoom/schemas';
import { GetParishesUseCasePort } from '../ports/in/get-parishes.use-case.port';
import { ParishRepositoryPort } from '../ports/out/parish-repository.port';

@Injectable()
export class GetParishesUseCase implements GetParishesUseCasePort {
	constructor(private readonly parishRepo: ParishRepositoryPort) {}

	execute(municipalityId: string): Promise<TParishItem[]> {
		return this.parishRepo.findAllByMunicipalityId(municipalityId);
	}
}
