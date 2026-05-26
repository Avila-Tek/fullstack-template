import type { TInternationalPhonePrefixItem } from '@zoom/schemas';

export abstract class GetInternationalPhonePrefixesUseCasePort {
	abstract execute(): Promise<TInternationalPhonePrefixItem[]>;
}
