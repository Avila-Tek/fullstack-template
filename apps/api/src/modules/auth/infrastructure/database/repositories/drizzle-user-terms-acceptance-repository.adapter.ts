import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
	type CreateUserTermsAcceptanceInput,
	UserTermsAcceptanceRepositoryPort,
} from '../../../application/ports/out/user-terms-acceptance-repository.port';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

@Injectable()
export class DrizzleUserTermsAcceptanceRepository
	implements UserTermsAcceptanceRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async create(input: CreateUserTermsAcceptanceInput): Promise<void> {
		await this.db
			.insert(schema.userTermsAcceptance)
			.values({
				userId: input.userId,
				systemId: input.systemId,
				systemTermsId: input.systemTermsId,
				sessionId: input.sessionId,
				ipAddress: input.ipAddress ?? undefined,
				userAgent: input.userAgent ?? undefined,
			})
			.onConflictDoNothing();
	}

	async findLatestByUserAndSystem(
		userId: string,
		systemId: string,
	): Promise<{ systemTermsId: string; acceptedAt: Date } | null> {
		const rows = await this.db
			.select({
				systemTermsId: schema.userTermsAcceptance.systemTermsId,
				acceptedAt: schema.userTermsAcceptance.acceptedAt,
			})
			.from(schema.userTermsAcceptance)
			.where(
				and(
					eq(schema.userTermsAcceptance.userId, userId),
					eq(schema.userTermsAcceptance.systemId, systemId),
				),
			)
			.orderBy(desc(schema.userTermsAcceptance.acceptedAt))
			.limit(1);

		const row = rows[0];
		if (!row) return null;
		return { systemTermsId: row.systemTermsId, acceptedAt: row.acceptedAt };
	}
}
