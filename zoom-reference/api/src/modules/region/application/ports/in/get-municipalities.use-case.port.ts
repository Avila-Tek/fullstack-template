import type { TMunicipalityItem } from '@zoom/schemas';

export abstract class GetMunicipalitiesUseCasePort {
	abstract execute(stateId: string): Promise<TMunicipalityItem[]>;
}
