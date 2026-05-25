import { Injectable } from '@nestjs/common';
import type { TPhonePrefixItem } from '@zoom/schemas';
import { GetPhonePrefixesUseCasePort } from '../ports/in/get-phone-prefixes.use-case.port';
import { PhonePrefixMasterRepositoryPort } from '../ports/out/phone-prefix-master-repository.port';

@Injectable()
export class GetPhonePrefixesUseCase implements GetPhonePrefixesUseCasePort {
	constructor(
		private readonly phonePrefixRepo: PhonePrefixMasterRepositoryPort,
	) {}

	execute(): Promise<TPhonePrefixItem[]> {
		return this.phonePrefixRepo.findAll();
	}
}
