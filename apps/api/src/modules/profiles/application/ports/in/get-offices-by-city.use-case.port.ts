import type { TGetOfficesByCityOutput } from '@zoom/schemas';

export abstract class GetOfficesByCityUseCasePort {
	abstract execute(cityId: string): Promise<TGetOfficesByCityOutput>;
}
