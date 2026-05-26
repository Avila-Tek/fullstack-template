import type { TMunicipalityItem } from '@zoom/schemas';

export abstract class MunicipalityRepositoryPort {
	abstract findById(id: string): Promise<{ id: string } | null>;
	abstract findAllByStateId(stateId: string): Promise<TMunicipalityItem[]>;
}
