import type { TDocumentTypeItem } from '@zoom/schemas';

export abstract class GetDocumentTypesUseCasePort {
	abstract execute(): Promise<TDocumentTypeItem[]>;
}
