import type { TParishItem } from '@zoom/schemas';

export abstract class ParishRepositoryPort {
	abstract findById(id: string): Promise<{ id: string } | null>;
	abstract findAllByMunicipalityId(
		municipalityId: string,
	): Promise<TParishItem[]>;
}
