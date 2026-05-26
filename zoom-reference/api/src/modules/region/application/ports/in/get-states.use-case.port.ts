import type { TStateItem } from '@zoom/schemas';

export abstract class GetStatesUseCasePort {
	abstract execute(countryId?: string): Promise<TStateItem[]>;
}
