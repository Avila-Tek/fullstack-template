import type { TCityItem } from '@zoom/schemas';

export abstract class CityRepositoryPort {
	abstract findById(id: string): Promise<{ id: string } | null>;
	abstract findNameById(id: string): Promise<string | null>;
	abstract findAll(stateId?: string): Promise<TCityItem[]>;
	abstract findLegacyIdById(id: string): Promise<number | null>;
}
