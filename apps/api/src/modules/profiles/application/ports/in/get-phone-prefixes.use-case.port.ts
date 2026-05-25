import type { TPhonePrefixItem } from '@zoom/schemas';

export abstract class GetPhonePrefixesUseCasePort {
	abstract execute(): Promise<TPhonePrefixItem[]>;
}
