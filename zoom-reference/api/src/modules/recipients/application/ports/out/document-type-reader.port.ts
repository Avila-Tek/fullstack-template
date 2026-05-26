export abstract class DocumentTypeReaderPort {
	abstract findCodeById(id: string): Promise<string | null>;
}
