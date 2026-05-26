import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type {
	BusinessAccountRepositoryPort,
	EditContextAccountRecord,
	NewBusinessAccountProps,
	UpdateBusinessAccountFields,
} from '../../application/ports/out/business-account-repository.port';
import { businessAccount } from './business-account.schema';

@Injectable()
export class DrizzleBusinessAccountRepositoryAdapter
	implements BusinessAccountRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async existsByDocument(
		documentTypeId: string,
		documentNumber: string,
	): Promise<boolean> {
		const rows = await this.db
			.select({ id: businessAccount.id })
			.from(businessAccount)
			.where(
				and(
					eq(businessAccount.documentTypeId, documentTypeId),
					eq(businessAccount.documentNumber, documentNumber),
					eq(businessAccount.isDeleted, false),
				),
			)
			.limit(1);
		return rows.length > 0;
	}

	async create(data: NewBusinessAccountProps): Promise<{ id: string }> {
		const [row] = await this.db
			.insert(businessAccount)
			.values({
				coreClientCode: data.coreClientCode,
				coreClientStatus: data.coreClientStatus,
				documentTypeId: data.documentTypeId,
				documentType: data.documentType,
				documentNumber: data.documentNumber,
				firstName: data.firstName ?? null,
				lastName: data.lastName ?? null,
				legalName: data.legalName ?? null,
				phonePrefixId: data.phonePrefixId ?? null,
				phonePrefix: data.phonePrefix ?? null,
				phoneNumber: data.phoneNumber ?? null,
				email: data.email ?? null,
				billingAddressId: data.billingAddressId ?? null,
			})
			.returning({ id: businessAccount.id });
		return { id: row.id };
	}

	async findEditContextById(
		businessAccountId: string,
	): Promise<EditContextAccountRecord | null> {
		const rows = await this.db
			.select({
				coreClientCode: businessAccount.coreClientCode,
				email: businessAccount.email,
				firstName: businessAccount.firstName,
				lastName: businessAccount.lastName,
				legalName: businessAccount.legalName,
				phonePrefixId: businessAccount.phonePrefixId,
				phonePrefix: businessAccount.phonePrefix,
				phoneNumber: businessAccount.phoneNumber,
			})
			.from(businessAccount)
			.where(
				and(
					eq(businessAccount.id, businessAccountId),
					eq(businessAccount.isDeleted, false),
				),
			)
			.limit(1);
		return rows[0] ?? null;
	}

	async findByIdForUpdate(businessAccountId: string): Promise<{
		id: string;
		billingAddressId: string | null;
		isDeleted: boolean;
		firstName: string | null;
		lastName: string | null;
		legalName: string | null;
		phonePrefixId: string | null;
		phonePrefix: string | null;
		phoneNumber: string | null;
	} | null> {
		const rows = await this.db
			.select({
				id: businessAccount.id,
				billingAddressId: businessAccount.billingAddressId,
				isDeleted: businessAccount.isDeleted,
				firstName: businessAccount.firstName,
				lastName: businessAccount.lastName,
				legalName: businessAccount.legalName,
				phonePrefixId: businessAccount.phonePrefixId,
				phonePrefix: businessAccount.phonePrefix,
				phoneNumber: businessAccount.phoneNumber,
			})
			.from(businessAccount)
			.where(eq(businessAccount.id, businessAccountId))
			.limit(1)
			.for('update');
		return rows[0] ?? null;
	}

	async updateEditable(
		businessAccountId: string,
		fields: UpdateBusinessAccountFields,
	): Promise<void> {
		const result = await this.db
			.update(businessAccount)
			.set({
				legalName: fields.legalName,
				firstName: fields.firstName,
				lastName: fields.lastName,
				phonePrefixId: fields.phonePrefixId,
				phonePrefix: fields.phonePrefix,
				phoneNumber: fields.phoneNumber,
				billingAddressId: fields.billingAddressId,
			})
			.where(
				and(
					eq(businessAccount.id, businessAccountId),
					eq(businessAccount.isDeleted, false),
				),
			)
			.returning({ id: businessAccount.id });

		if (result.length === 0) {
			throw new Error(
				`Failed to update business account ${businessAccountId}: not found or already deleted`,
			);
		}
	}
}
