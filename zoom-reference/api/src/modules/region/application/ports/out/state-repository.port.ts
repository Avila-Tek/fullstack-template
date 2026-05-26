import type { TStateItem } from '@zoom/schemas';

export interface RegionState {
	id: string;
	countryId: string;
}

export abstract class StateRepositoryPort {
	abstract findById(id: string): Promise<RegionState | null>;
	abstract findNameById(id: string): Promise<string | null>;
	abstract findAllByCountryId(countryId: string): Promise<TStateItem[]>;
}
