import { Injectable } from '@nestjs/common';
import type { TInternationalPhonePrefixItem } from '@zoom/schemas';
import { GetInternationalPhonePrefixesUseCasePort } from '../ports/in/get-international-phone-prefixes.use-case.port';
import { PhonePrefixMasterRepositoryPort } from '../ports/out/phone-prefix-master-repository.port';

@Injectable()
export class GetInternationalPhonePrefixesUseCase
	implements GetInternationalPhonePrefixesUseCasePort
{
	constructor(
		private readonly phonePrefixRepo: PhonePrefixMasterRepositoryPort,
	) {}

	execute(): Promise<TInternationalPhonePrefixItem[]> {
		return this.phonePrefixRepo.findAllByScope('international');
	}
}
