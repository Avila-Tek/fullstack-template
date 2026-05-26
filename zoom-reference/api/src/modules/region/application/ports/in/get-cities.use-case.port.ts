import type { TCityItem } from '@zoom/schemas';

export abstract class GetCitiesUseCasePort {
	abstract execute(stateId?: string): Promise<TCityItem[]>;
}
