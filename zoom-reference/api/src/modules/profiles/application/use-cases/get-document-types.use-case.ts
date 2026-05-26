import { Injectable } from '@nestjs/common';
import type { TDocumentTypeItem } from '@zoom/schemas';
import { GetDocumentTypesUseCasePort } from '../ports/in/get-document-types.use-case.port';
import { DocumentTypeMasterRepositoryPort } from '../ports/out/document-type-master-repository.port';

@Injectable()
export class GetDocumentTypesUseCase implements GetDocumentTypesUseCasePort {
	constructor(
		private readonly documentTypeRepo: DocumentTypeMasterRepositoryPort,
	) {}

	execute(): Promise<TDocumentTypeItem[]> {
		return this.documentTypeRepo.findAll();
	}
}
