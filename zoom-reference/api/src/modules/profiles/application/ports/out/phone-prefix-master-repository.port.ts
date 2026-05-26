import type {
	TInternationalPhonePrefixItem,
	TPhonePrefixItem,
} from '@zoom/schemas';

export interface PhonePrefixMasterRecord {
	id: string;
}

export abstract class PhonePrefixMasterRepositoryPort {
	abstract findByPrefix(
		prefix: string,
	): Promise<PhonePrefixMasterRecord | null>;
	abstract findAll(): Promise<TPhonePrefixItem[]>;
	abstract findAllByScope(
		scope: 'national' | 'international',
	): Promise<TInternationalPhonePrefixItem[]>;
	abstract findValueById(id: string): Promise<string | null>;
}
