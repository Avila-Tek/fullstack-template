import { Injectable } from '@nestjs/common';
import type { TGetOfficesByCityOutput } from '@zoom/schemas';
import { GetOfficesByCityUseCasePort } from '../ports/in/get-offices-by-city.use-case.port';
import { OfficeMasterRepositoryPort } from '../ports/out/office-master-repository.port';

@Injectable()
export class GetOfficesByCityUseCase implements GetOfficesByCityUseCasePort {
	constructor(private readonly officeRepo: OfficeMasterRepositoryPort) {}

	async execute(cityId: string): Promise<TGetOfficesByCityOutput> {
		const offices = await this.officeRepo.findActiveByCityId(cityId);
		return offices.map((o) => ({ id: o.id, name: o.name }));
	}
}
