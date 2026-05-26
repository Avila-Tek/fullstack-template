import type { TDocumentTypeItem } from '@zoom/schemas';

export interface DocumentTypeMasterRecord {
	id: string;
	legacyId: number;
}

export abstract class DocumentTypeMasterRepositoryPort {
	abstract findByCode(code: string): Promise<DocumentTypeMasterRecord | null>;
	abstract findCodeById(id: string): Promise<string | null>;
	abstract findAll(): Promise<TDocumentTypeItem[]>;
}
