import { Inject, Injectable } from '@nestjs/common';
import type { TDocumentTypeItem } from '@zoom/schemas';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type {
	DocumentTypeMasterRecord,
	DocumentTypeMasterRepositoryPort,
} from '../../application/ports/out/document-type-master-repository.port';
import { documentTypeMaster } from './document-type-master.schema';

@Injectable()
export class DrizzleDocumentTypeMasterRepositoryAdapter
	implements DocumentTypeMasterRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findByCode(code: string): Promise<DocumentTypeMasterRecord | null> {
		const rows = await this.db
			.select({
				id: documentTypeMaster.id,
				legacyId: documentTypeMaster.legacyId,
			})
			.from(documentTypeMaster)
			.where(eq(documentTypeMaster.code, code));
		return rows[0] ?? null;
	}

	async findCodeById(id: string): Promise<string | null> {
		const rows = await this.db
			.select({ code: documentTypeMaster.code })
			.from(documentTypeMaster)
			.where(
				and(
					eq(documentTypeMaster.id, id),
					eq(documentTypeMaster.isActive, true),
				),
			);
		return rows[0]?.code ?? null;
	}

	findAll(): Promise<TDocumentTypeItem[]> {
		return this.db
			.select({
				id: documentTypeMaster.id,
				code: documentTypeMaster.code,
				name: documentTypeMaster.name,
			})
			.from(documentTypeMaster)
			.where(eq(documentTypeMaster.isActive, true))
			.orderBy(documentTypeMaster.name);
	}
}
