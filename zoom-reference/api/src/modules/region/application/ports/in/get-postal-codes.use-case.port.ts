import type { TPostalCodeItem } from '@zoom/schemas';

export abstract class GetPostalCodesUseCasePort {
	abstract execute(cityId: string): Promise<TPostalCodeItem[]>;
}
