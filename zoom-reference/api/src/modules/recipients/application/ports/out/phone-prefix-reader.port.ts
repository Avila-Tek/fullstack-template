export abstract class PhonePrefixReaderPort {
	abstract findValueById(id: string): Promise<string | null>;
}
