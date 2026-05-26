import type { TParishItem } from '@zoom/schemas';

export abstract class GetParishesUseCasePort {
	abstract execute(municipalityId: string): Promise<TParishItem[]>;
}
