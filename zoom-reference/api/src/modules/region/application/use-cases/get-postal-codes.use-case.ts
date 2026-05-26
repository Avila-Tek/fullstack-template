import { Injectable } from '@nestjs/common';
import type { TPostalCodeItem } from '@zoom/schemas';
import { GetPostalCodesUseCasePort } from '../ports/in/get-postal-codes.use-case.port';
import { PostalCodeRepositoryPort } from '../ports/out/postal-code-repository.port';

@Injectable()
export class GetPostalCodesUseCase implements GetPostalCodesUseCasePort {
	constructor(private readonly postalCodeRepo: PostalCodeRepositoryPort) {}

	execute(cityId: string): Promise<TPostalCodeItem[]> {
		return this.postalCodeRepo.findAllByCityId(cityId);
	}
}
