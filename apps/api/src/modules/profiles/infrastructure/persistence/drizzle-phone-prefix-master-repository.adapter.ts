import { Inject, Injectable } from '@nestjs/common';
import type {
	TInternationalPhonePrefixItem,
	TPhonePrefixItem,
} from '@zoom/schemas';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type {
	PhonePrefixMasterRecord,
	PhonePrefixMasterRepositoryPort,
} from '../../application/ports/out/phone-prefix-master-repository.port';
import { phonePrefixMaster } from './phone-prefix-master.schema';

@Injectable()
export class DrizzlePhonePrefixMasterRepositoryAdapter
	implements PhonePrefixMasterRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findByPrefix(prefix: string): Promise<PhonePrefixMasterRecord | null> {
		const rows = await this.db
			.select({ id: phonePrefixMaster.id })
			.from(phonePrefixMaster)
			.where(eq(phonePrefixMaster.prefix, prefix));
		return rows[0] ?? null;
	}

	findAll(): Promise<TPhonePrefixItem[]> {
		return this.db
			.select({
				id: phonePrefixMaster.id,
				prefix: phonePrefixMaster.prefix,
				carrierName: phonePrefixMaster.carrierName,
				prefixType: phonePrefixMaster.prefixType,
			})
			.from(phonePrefixMaster)
			.where(
				and(
					eq(phonePrefixMaster.scope, 'national'),
					eq(phonePrefixMaster.isActive, true),
				),
			)
			.orderBy(phonePrefixMaster.prefix);
	}

	async findAllByScope(
		scope: 'national' | 'international',
	): Promise<TInternationalPhonePrefixItem[]> {
		const rows = await this.db
			.select({
				id: phonePrefixMaster.id,
				countryPrefix: phonePrefixMaster.countryPrefix,
				countryIsoCode: phonePrefixMaster.countryIsoCode,
				carrierName: phonePrefixMaster.carrierName,
			})
			.from(phonePrefixMaster)
			.where(
				and(
					eq(phonePrefixMaster.scope, scope),
					eq(phonePrefixMaster.isActive, true),
				),
			)
			.orderBy(phonePrefixMaster.countryIsoCode);
		return rows.filter(
			(r): r is TInternationalPhonePrefixItem =>
				r.countryPrefix !== null && r.countryIsoCode !== null,
		);
	}

	async findValueById(id: string): Promise<string | null> {
		const rows = await this.db
			.select({ prefix: phonePrefixMaster.prefix })
			.from(phonePrefixMaster)
			.where(
				and(eq(phonePrefixMaster.id, id), eq(phonePrefixMaster.isActive, true)),
			)
			.limit(1);
		return rows[0]?.prefix ?? null;
	}
}
