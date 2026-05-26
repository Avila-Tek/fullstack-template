import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import {
	and,
	count,
	desc,
	eq,
	ilike,
	isNull,
	or,
	type SQL,
	sql,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { address } from '../../../profiles/infrastructure/persistence/address.schema';
import { cityMaster } from '../../../region/infrastructure/persistence/city-master.schema';
import { stateMaster } from '../../../region/infrastructure/persistence/state-master.schema';
import type {
	NewRecipientProps,
	RecipientListFilter,
	RecipientListRow,
	RecipientPredicateFilter,
	RecipientRepositoryPort,
} from '../../application/ports/out/recipient-repository.port';
import { recipient } from './recipient.schema';
import { recipientStarred } from './recipient-starred.schema';

@Injectable()
export class DrizzleRecipientRepositoryAdapter
	implements RecipientRepositoryPort
{
	constructor(
		@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {}

	async create(data: NewRecipientProps): Promise<{ id: string }> {
		try {
			const [row] = await this.db
				.insert(recipient)
				.values({
					businessAccountId: data.businessAccountId,
					ownerBusinessProfileId: data.ownerBusinessProfileId,
					isBusinessAccountOwner: data.isBusinessAccountOwner,
					deliveryType: data.deliveryType,
					serviceScope: data.serviceScope,
					status: data.status,
					name: data.name,
					alias: data.alias ?? null,
					contactName: data.contactName ?? null,
					documentTypeId: data.documentTypeId ?? null,
					documentType: data.documentType ?? null,
					documentNumber: data.documentNumber ?? null,
					internationalDocument: data.internationalDocument ?? null,
					cellphonePrefixId: data.cellphonePrefixId ?? null,
					cellphonePrefix: data.cellphonePrefix ?? null,
					cellphoneNumber: data.cellphoneNumber ?? null,
					phonePrefixId: data.phonePrefixId ?? null,
					phonePrefix: data.phonePrefix ?? null,
					internationalCellphonePrefixId:
						data.internationalCellphonePrefixId ?? null,
					internationalCellphonePrefix:
						data.internationalCellphonePrefix ?? null,
					internationalPhonePrefixId: data.internationalPhonePrefixId ?? null,
					internationalPhonePrefix: data.internationalPhonePrefix ?? null,
					phoneNumber: data.phoneNumber ?? null,
					email: data.email ?? null,
					addressId: data.addressId ?? null,
					locality: data.locality ?? null,
					observation: data.observation ?? null,
					lockerMasterId: data.lockerMasterId ?? null,
					lockerPrefix: data.lockerPrefix ?? null,
					lockerCode: data.lockerCode ?? null,
				})
				.returning({ id: recipient.id });
			this.logger.info(
				{
					requestMethod: 'CREATE',
					requestStatus: 'SUCCESS',
					requestError: 'none',
					entityType: 'recipient',
					entityId: row.id,
				},
				'Recipient created',
			);
			return { id: row.id };
		} catch (err) {
			const error = err as Error;
			this.logger.error(
				{
					requestMethod: 'CREATE',
					requestStatus: 'FAILED',
					requestError: error.message ?? error.stack ?? 'unknown',
					entityType: 'recipient',
					entityId: data.ownerBusinessProfileId ?? null,
				},
				'Recipient creation failed',
			);
			throw err;
		}
	}

	async findPaginated(
		filter: RecipientListFilter,
	): Promise<{ items: RecipientListRow[]; total: number }> {
		const where = this.buildWhereClause(filter);

		const selectFields = {
			id: recipient.id,
			alias: recipient.alias,
			name: recipient.name,
			recipientType: recipient.deliveryType,
			serviceScope: recipient.serviceScope,
			status: recipient.status,
			starred: sql<boolean>`coalesce(${recipientStarred.status} = 'active', false)`,
			stateName: stateMaster.name,
			cityName: cityMaster.name,
			formattedAddress: address.formattedAddress,
			internationalCityText: address.internationalCityText,
			countryName: address.countryName,
			lockerPrefix: recipient.lockerPrefix,
			lockerCode: recipient.lockerCode,
			ownerBusinessProfileId: recipient.ownerBusinessProfileId,
			isBusinessAccountOwner: recipient.isBusinessAccountOwner,
			createdAt: recipient.createdAt,
		};

		const baseQuery = this.db
			.select(selectFields)
			.from(recipient)
			.leftJoin(address, eq(recipient.addressId, address.id))
			.leftJoin(stateMaster, eq(address.stateId, stateMaster.id))
			.leftJoin(cityMaster, eq(address.cityId, cityMaster.id))
			.leftJoin(
				recipientStarred,
				and(
					eq(recipientStarred.recipientId, recipient.id),
					eq(recipientStarred.businessProfileId, filter.callerProfileId),
				),
			)
			.where(where);

		const countQuery = this.db
			.select({ value: count() })
			.from(recipient)
			.leftJoin(
				recipientStarred,
				and(
					eq(recipientStarred.recipientId, recipient.id),
					eq(recipientStarred.businessProfileId, filter.callerProfileId),
				),
			)
			.where(where);

		const page = Math.max(1, filter.page);
		const [rows, [{ value: total }]] = await Promise.all([
			baseQuery
				.orderBy(desc(recipient.createdAt))
				.limit(filter.limit)
				.offset((page - 1) * filter.limit),
			countQuery,
		]);

		return {
			items: rows,
			total,
		};
	}

	async findByIdWithPredicate(
		id: string,
		predicate: RecipientPredicateFilter,
	): Promise<RecipientListRow | null> {
		const predicateConditions = this.buildPredicateConditions(predicate);
		const where = and(
			eq(recipient.id, id),
			isNull(recipient.deletedAt),
			eq(recipient.businessAccountId, predicate.businessAccountId),
			predicateConditions,
		);

		const rows = await this.db
			.select({
				id: recipient.id,
				alias: recipient.alias,
				name: recipient.name,
				recipientType: recipient.deliveryType,
				serviceScope: recipient.serviceScope,
				status: recipient.status,
				starred: sql<boolean>`coalesce(${recipientStarred.status} = 'active', false)`,
				stateName: stateMaster.name,
				cityName: cityMaster.name,
				formattedAddress: address.formattedAddress,
				internationalCityText: address.internationalCityText,
				countryName: address.countryName,
				lockerPrefix: recipient.lockerPrefix,
				lockerCode: recipient.lockerCode,
				ownerBusinessProfileId: recipient.ownerBusinessProfileId,
				isBusinessAccountOwner: recipient.isBusinessAccountOwner,
				createdAt: recipient.createdAt,
			})
			.from(recipient)
			.leftJoin(address, eq(recipient.addressId, address.id))
			.leftJoin(stateMaster, eq(address.stateId, stateMaster.id))
			.leftJoin(cityMaster, eq(address.cityId, cityMaster.id))
			.leftJoin(
				recipientStarred,
				and(
					eq(recipientStarred.recipientId, recipient.id),
					eq(recipientStarred.businessProfileId, predicate.callerProfileId),
				),
			)
			.where(where)
			.limit(1);

		return rows[0] ?? null;
	}

	async updateStarred(
		id: string,
		starred: boolean,
		callerProfileId: string,
	): Promise<{ id: string; starred: boolean; updatedAt: Date }> {
		const status = starred ? 'active' : ('inactive' as const);
		const now = new Date();
		await this.db
			.insert(recipientStarred)
			.values({
				recipientId: id,
				businessProfileId: callerProfileId,
				status,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: [
					recipientStarred.recipientId,
					recipientStarred.businessProfileId,
				],
				set: { status, updatedAt: now },
			});
		return { id, starred, updatedAt: now };
	}

	private buildWhereClause(filter: RecipientListFilter): SQL {
		const base = and(
			eq(recipient.businessAccountId, filter.businessAccountId),
			isNull(recipient.deletedAt),
			this.buildPredicateConditions(filter),
		);

		const optional: SQL[] = [];
		if (filter.recipientType) {
			optional.push(eq(recipient.deliveryType, filter.recipientType));
		}
		if (filter.serviceScope) {
			optional.push(eq(recipient.serviceScope, filter.serviceScope));
		}
		if (filter.status !== 'all') {
			optional.push(eq(recipient.status, filter.status));
		}
		if (filter.starred === true) {
			optional.push(eq(recipientStarred.status, 'active'));
		}
		if (filter.search) {
			const term = `%${filter.search}%`;
			optional.push(
				or(
					ilike(recipient.name, term),
					ilike(recipient.alias, term),
					ilike(recipient.lockerCode, term),
				) as SQL,
			);
		}

		if (optional.length === 0) return base as SQL;
		return and(base, ...optional) as SQL;
	}

	private buildPredicateConditions(predicate: {
		callerRole: 'owner' | 'member';
		callerProfileId: string;
		hasShareGuide: boolean;
		hasShareLocker: boolean;
	}): SQL {
		if (predicate.callerRole === 'owner') {
			return sql`true`;
		}

		const branches: SQL[] = [
			eq(recipient.ownerBusinessProfileId, predicate.callerProfileId),
		];

		if (predicate.hasShareGuide) {
			branches.push(eq(recipient.deliveryType, 'guia'));
		}
		if (predicate.hasShareLocker) {
			branches.push(eq(recipient.deliveryType, 'locker'));
		}

		return or(...branches) as SQL;
	}
}
