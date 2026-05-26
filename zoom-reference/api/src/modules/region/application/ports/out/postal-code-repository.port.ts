import type { TPostalCodeItem } from '@zoom/schemas';

export abstract class PostalCodeRepositoryPort {
	abstract findById(id: string): Promise<{ id: string } | null>;
	abstract findAllByCityId(cityId: string): Promise<TPostalCodeItem[]>;
}
