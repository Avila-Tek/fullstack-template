import { Inject, Injectable } from '@nestjs/common';
import { desc, gt, isNull, or, sql } from 'drizzle-orm';
import { JwkRepositoryPort } from '../../../application/ports/out/jwk-repository.port';
import type { JwkEntity } from '../../../domain/entities/jwk.entity';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

// Active key condition: expiresAt IS NULL (no TTL set) or expiresAt is in the future.
const activeKeyCondition = or(
	isNull(schema.jwks.expiresAt),
	gt(schema.jwks.expiresAt, sql`NOW()`),
);

@Injectable()
export class DrizzleJwkRepository implements JwkRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async getActiveKey(): Promise<JwkEntity | null> {
		const [row] = await this.db
			.select()
			.from(schema.jwks)
			.where(activeKeyCondition)
			.orderBy(desc(schema.jwks.createdAt))
			.limit(1);

		if (!row) return null;
		return this.toEntity(row);
	}

	async getAllVerificationKeys(): Promise<JwkEntity[]> {
		const rows = await this.db
			.select()
			.from(schema.jwks)
			.where(activeKeyCondition)
			.orderBy(desc(schema.jwks.createdAt));

		return rows.map((row) => this.toEntity(row));
	}

	private toEntity(row: typeof schema.jwks.$inferSelect): JwkEntity {
		return {
			id: row.id,
			// Better Auth uses the row id as the key identifier in the JWKS endpoint
			kid: row.id,
			publicJwk: row.publicKey,
			privateJwk: row.privateKey,
			algorithm: 'ES256',
		};
	}
}
