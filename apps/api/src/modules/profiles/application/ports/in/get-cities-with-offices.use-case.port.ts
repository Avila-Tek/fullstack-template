import type { TGetCitiesWithOfficesOutput } from '@zoom/schemas';

export abstract class GetCitiesWithOfficesUseCasePort {
	abstract execute(): Promise<TGetCitiesWithOfficesOutput>;
}
