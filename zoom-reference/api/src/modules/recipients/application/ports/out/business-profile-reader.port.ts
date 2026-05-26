export abstract class BusinessProfileReaderPort {
	abstract findNamesByIds(ids: string[]): Promise<Map<string, string | null>>;
}
