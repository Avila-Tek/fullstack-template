import { Inject, Injectable } from '@nestjs/common';
import type {
	TResolveEditLookupsInput,
	TResolveEditLookupsOutput,
} from '@zoom/schemas';
import { CityRepositoryPort } from '../../../region/application/ports/out/city-repository.port';
import { StateRepositoryPort } from '../../../region/application/ports/out/state-repository.port';
import { ResolveEditLookupsUseCasePort } from '../ports/in/resolve-edit-lookups.use-case.port';
import { DocumentTypeMasterRepositoryPort } from '../ports/out/document-type-master-repository.port';
import { PhonePrefixMasterRepositoryPort } from '../ports/out/phone-prefix-master-repository.port';

@Injectable()
export class ResolveEditLookupsUseCase
	implements ResolveEditLookupsUseCasePort
{
	constructor(
		@Inject(DocumentTypeMasterRepositoryPort)
		private readonly documentTypeRepo: DocumentTypeMasterRepositoryPort,
		@Inject(PhonePrefixMasterRepositoryPort)
		private readonly phonePrefixRepo: PhonePrefixMasterRepositoryPort,
		@Inject(StateRepositoryPort)
		private readonly stateRepo: StateRepositoryPort,
		@Inject(CityRepositoryPort)
		private readonly cityRepo: CityRepositoryPort,
	) {}

	async execute(
		input: TResolveEditLookupsInput,
	): Promise<TResolveEditLookupsOutput> {
		const [
			documentTypeValue,
			phonePrefixValue,
			stateName,
			cityName,
			cityLegacyId,
		] = await Promise.all([
			input.documentTypeId
				? this.documentTypeRepo.findCodeById(input.documentTypeId)
				: Promise.resolve(null),
			input.phonePrefixId
				? this.phonePrefixRepo.findValueById(input.phonePrefixId)
				: Promise.resolve(null),
			input.stateId
				? this.stateRepo.findNameById(input.stateId)
				: Promise.resolve(null),
			input.cityId
				? this.cityRepo.findNameById(input.cityId)
				: Promise.resolve(null),
			input.cityId
				? this.cityRepo.findLegacyIdById(input.cityId)
				: Promise.resolve(null),
		]);

		return {
			documentTypeValue,
			phonePrefixValue,
			stateName,
			cityName,
			cityLegacyId,
		};
	}
}
