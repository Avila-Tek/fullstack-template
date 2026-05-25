import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { alias } from 'drizzle-orm/pg-core';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type {
	BusinessOwnerRecord,
	BusinessProfileRepositoryPort,
	CollaboratorForUpdateRecord,
	CollaboratorRecord,
	CurrentUserRecord,
	NewBusinessProfileProps,
	NewInvitedBusinessProfileProps,
	ProfileDetailRecord,
	ProfileRecord,
	UpdateMemberFields,
	UpdateOwnerSyncFields,
	UpdatePreferencesData,
	UserPreferencesRecord,
} from '../../application/ports/out/business-profile-repository.port';
import { address } from './address.schema';
import { businessAccount } from './business-account.schema';
import { businessProfile } from './business-profile.schema';
import { businessProfileSettings } from './business-profile-settings.schema';
import { unitOfMeasureMaster } from './unit-of-measure-master.schema';

@Injectable()
export class DrizzleBusinessProfileRepositoryAdapter
	implements BusinessProfileRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findOwnerByUserId(userId: string): Promise<BusinessOwnerRecord | null> {
		const rows = await this.db
			.select({
				id: businessProfile.id,
				businessAccountId: businessProfile.businessAccountId,
			})
			.from(businessProfile)
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.role, 'owner'),
					eq(businessProfile.isDeleted, false),
				),
			)
			.limit(1);
		return rows[0] ?? null;
	}

	async findCurrentUserByUserId(
		userId: string,
	): Promise<CurrentUserRecord | null> {
		const rows = await this.db
			.select({
				businessProfileId: businessProfile.id,
				legalName: businessProfile.legalName,
				email: businessProfile.email,
				coreClientCode: businessAccount.coreClientCode,
				coreClientStatus: businessAccount.coreClientStatus,
			})
			.from(businessProfile)
			.innerJoin(
				businessAccount,
				eq(businessProfile.businessAccountId, businessAccount.id),
			)
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.isDeleted, false),
					eq(businessProfile.status, 'active'),
				),
			)
			// A user may belong to multiple business accounts; pick the oldest profile
			// as the primary identity source for the current-user summary.
			.orderBy(asc(businessProfile.createdAt))
			.limit(1);

		const row = rows[0];
		if (!row) return null;

		const code = row.coreClientCode;
		const clientCodeLastFour =
			code && code.length >= 4 ? code.slice(-4) : '****';

		return {
			businessProfileId: row.businessProfileId,
			legalName: row.legalName ?? null,
			email: row.email ?? null,
			clientCodeLastFour,
			coreClientStatus: row.coreClientStatus,
		};
	}

	async findProfileDetailByUserId(
		userId: string,
	): Promise<ProfileDetailRecord | null> {
		const rows = await this.db
			.select({
				id: businessProfile.id,
				role: businessProfile.role,
				status: businessProfile.status,
				firstName: businessProfile.firstName,
				lastName: businessProfile.lastName,
				email: businessProfile.email,
				phoneNumber: businessProfile.phoneNumber,
				phonePrefixId: businessProfile.phonePrefixId,
				phonePrefix: businessProfile.phonePrefix,
				documentTypeId: businessProfile.documentTypeId,
				documentType: businessProfile.documentType,
				documentNumber: businessProfile.documentNumber,
				businessAccountId: businessProfile.businessAccountId,
				legalName: businessProfile.legalName,
				billingAddressId: businessProfile.billingAddressId,
				billingAddressLine1: address.addressLine1,
				billingAddressCountryId: address.countryId,
				billingAddressStateId: address.stateId,
				billingAddressCityId: address.cityId,
			})
			.from(businessProfile)
			.leftJoin(address, eq(businessProfile.billingAddressId, address.id))
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.isDeleted, false),
				),
			)
			// A user may belong to multiple business accounts; pick the oldest profile
			// as the primary identity source for the profile detail view.
			.orderBy(asc(businessProfile.createdAt))
			.limit(1);

		const row = rows[0];
		if (!row) return null;

		return {
			id: row.id,
			role: row.role,
			status: row.status,
			firstName: row.firstName ?? null,
			lastName: row.lastName ?? null,
			email: row.email ?? null,
			phoneNumber: row.phoneNumber ?? null,
			phonePrefixId: row.phonePrefixId ?? null,
			phonePrefix: row.phonePrefix ?? null,
			documentTypeId: row.documentTypeId,
			documentType: row.documentType,
			documentNumber: row.documentNumber,
			businessAccountId: row.businessAccountId,
			legalName: row.legalName ?? null,
			billingAddressId: row.billingAddressId ?? null,
			billingAddressLine1: row.billingAddressLine1 ?? null,
			billingAddressCountryId: row.billingAddressCountryId ?? null,
			billingAddressStateId: row.billingAddressStateId ?? null,
			billingAddressCityId: row.billingAddressCityId ?? null,
		};
	}

	async findOwnerInAccount(
		userId: string,
		businessAccountId: string,
	): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: businessProfile.id })
			.from(businessProfile)
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.businessAccountId, businessAccountId),
					eq(businessProfile.role, 'owner'),
					eq(businessProfile.isDeleted, false),
				),
			)
			.limit(1);
		return rows[0] ?? null;
	}

	async findActiveOrInvitedByEmail(
		normalizedEmail: string,
	): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: businessProfile.id })
			.from(businessProfile)
			.where(
				and(
					eq(businessProfile.email, normalizedEmail),
					inArray(businessProfile.status, ['active', 'invited']),
					eq(businessProfile.isDeleted, false),
				),
			)
			.limit(1);
		return rows[0] ?? null;
	}

	async create(data: NewBusinessProfileProps): Promise<{ id: string }> {
		const [row] = await this.db
			.insert(businessProfile)
			.values({
				documentTypeId: data.documentTypeId,
				documentType: data.documentType,
				documentNumber: data.documentNumber,
				firstName: data.firstName ?? null,
				lastName: data.lastName ?? null,
				legalName: data.legalName ?? null,
				phonePrefixId: data.phonePrefixId ?? null,
				phonePrefix: data.phonePrefix ?? null,
				phoneNumber: data.phoneNumber ? data.phoneNumber : null,
				email: data.email ?? null,
				billingAddressId: data.billingAddressId ?? null,
				businessAccountId: data.businessAccountId,
				userId: data.userId,
				role: data.role,
			})
			.returning({ id: businessProfile.id });
		return { id: row.id };
	}

	async findOwnerForUpdate(
		userId: string,
		businessAccountId: string,
	): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: businessProfile.id })
			.from(businessProfile)
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.businessAccountId, businessAccountId),
					eq(businessProfile.role, 'owner'),
					eq(businessProfile.isDeleted, false),
				),
			)
			.limit(1)
			.for('update');
		return rows[0] ?? null;
	}

	async updateOwnerSync(
		userId: string,
		businessAccountId: string,
		fields: UpdateOwnerSyncFields,
	): Promise<void> {
		const updates: Record<string, unknown> = {};
		if (fields.firstName !== undefined) updates.firstName = fields.firstName;
		if (fields.lastName !== undefined) updates.lastName = fields.lastName;
		if (fields.legalName !== undefined) updates.legalName = fields.legalName;
		if (fields.phonePrefixId !== undefined)
			updates.phonePrefixId = fields.phonePrefixId;
		if (fields.phonePrefix !== undefined)
			updates.phonePrefix = fields.phonePrefix;
		if (fields.phoneNumber !== undefined)
			updates.phoneNumber = fields.phoneNumber ? fields.phoneNumber : null;
		if (fields.billingAddressId !== undefined)
			updates.billingAddressId = fields.billingAddressId;

		if (Object.keys(updates).length === 0) return;

		await this.db
			.update(businessProfile)
			.set(updates)
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.businessAccountId, businessAccountId),
					eq(businessProfile.role, 'owner'),
					eq(businessProfile.isDeleted, false),
				),
			);
	}

	async findMemberForUpdate(
		userId: string,
		businessAccountId: string,
	): Promise<{
		id: string;
		firstName: string | null;
		lastName: string | null;
		legalName: string | null;
		documentTypeId: string;
		documentNumber: string;
		phonePrefixId: string | null;
		phonePrefix: string | null;
		phoneNumber: string | null;
		billingAddressId: string | null;
	} | null> {
		const rows = await this.db
			.select({
				id: businessProfile.id,
				firstName: businessProfile.firstName,
				lastName: businessProfile.lastName,
				legalName: businessProfile.legalName,
				documentTypeId: businessProfile.documentTypeId,
				documentNumber: businessProfile.documentNumber,
				phonePrefixId: businessProfile.phonePrefixId,
				phonePrefix: businessProfile.phonePrefix,
				phoneNumber: businessProfile.phoneNumber,
				billingAddressId: businessProfile.billingAddressId,
			})
			.from(businessProfile)
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.businessAccountId, businessAccountId),
					eq(businessProfile.role, 'member'),
					eq(businessProfile.isDeleted, false),
				),
			)
			.limit(1)
			.for('update');
		return rows[0] ?? null;
	}

	async updateMember(
		userId: string,
		businessAccountId: string,
		fields: UpdateMemberFields,
	): Promise<void> {
		const updates: Record<string, unknown> = {};
		if (fields.firstName !== undefined) updates.firstName = fields.firstName;
		if (fields.lastName !== undefined) updates.lastName = fields.lastName;
		if (fields.legalName !== undefined) updates.legalName = fields.legalName;
		if (fields.phonePrefixId !== undefined)
			updates.phonePrefixId = fields.phonePrefixId;
		if (fields.phonePrefix !== undefined)
			updates.phonePrefix = fields.phonePrefix;
		if (fields.phoneNumber !== undefined)
			updates.phoneNumber = fields.phoneNumber ? fields.phoneNumber : null;
		if (fields.billingAddressId !== undefined)
			updates.billingAddressId = fields.billingAddressId;

		if (Object.keys(updates).length === 0) return;

		await this.db
			.update(businessProfile)
			.set(updates)
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.businessAccountId, businessAccountId),
					eq(businessProfile.role, 'member'),
					eq(businessProfile.isDeleted, false),
				),
			);
	}

	async findPreferencesByUserId(
		userId: string,
	): Promise<UserPreferencesRecord | null> {
		const weightUnit = alias(unitOfMeasureMaster, 'weight_unit');
		const dimensionUnit = alias(unitOfMeasureMaster, 'dimension_unit');

		const rows = await this.db
			.select({
				weightUnitId: weightUnit.id,
				weightUnitCode: weightUnit.code,
				weightUnitName: weightUnit.name,
				weightUnitTypeCode: weightUnit.unitTypeCode,
				dimensionUnitId: dimensionUnit.id,
				dimensionUnitCode: dimensionUnit.code,
				dimensionUnitName: dimensionUnit.name,
				dimensionUnitTypeCode: dimensionUnit.unitTypeCode,
			})
			.from(businessProfile)
			.innerJoin(
				businessProfileSettings,
				eq(businessProfileSettings.businessProfileId, businessProfile.id),
			)
			.leftJoin(
				weightUnit,
				and(
					eq(
						businessProfileSettings.internationalMaritimeWeightUnitId,
						weightUnit.id,
					),
					eq(weightUnit.isActive, true),
				),
			)
			.leftJoin(
				dimensionUnit,
				and(
					eq(
						businessProfileSettings.internationalMaritimeDimensionUnitId,
						dimensionUnit.id,
					),
					eq(dimensionUnit.isActive, true),
				),
			)
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.isDeleted, false),
					eq(businessProfile.status, 'active'),
				),
			)
			.orderBy(asc(businessProfile.createdAt))
			.limit(1);

		const row = rows[0];
		if (!row) return null;

		return {
			weightUnit:
				row.weightUnitId &&
				row.weightUnitCode &&
				row.weightUnitName &&
				row.weightUnitTypeCode !== null
					? {
							id: row.weightUnitId,
							code: row.weightUnitCode,
							name: row.weightUnitName,
							unitTypeCode: row.weightUnitTypeCode,
						}
					: null,
			dimensionUnit:
				row.dimensionUnitId &&
				row.dimensionUnitCode &&
				row.dimensionUnitName &&
				row.dimensionUnitTypeCode !== null
					? {
							id: row.dimensionUnitId,
							code: row.dimensionUnitCode,
							name: row.dimensionUnitName,
							unitTypeCode: row.dimensionUnitTypeCode,
						}
					: null,
		};
	}

	async updatePreferencesByUserId(
		userId: string,
		data: UpdatePreferencesData,
	): Promise<void> {
		const profiles = await this.db
			.select({ id: businessProfile.id })
			.from(businessProfile)
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.isDeleted, false),
					eq(businessProfile.status, 'active'),
				),
			)
			.orderBy(asc(businessProfile.createdAt))
			.limit(1);

		const profile = profiles[0];
		if (!profile) return;

		const updateFields: UpdatePreferencesData = {};
		if (data.internationalMaritimeWeightUnitId) {
			updateFields.internationalMaritimeWeightUnitId =
				data.internationalMaritimeWeightUnitId;
		}
		if (data.internationalMaritimeDimensionUnitId) {
			updateFields.internationalMaritimeDimensionUnitId =
				data.internationalMaritimeDimensionUnitId;
		}

		await this.db
			.update(businessProfileSettings)
			.set(updateFields)
			.where(eq(businessProfileSettings.businessProfileId, profile.id));
	}

	async updateEmail(userId: string, email: string): Promise<void> {
		await this.db
			.update(businessProfile)
			.set({ email })
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.isDeleted, false),
				),
			);
	}

	async createInvited(
		data: NewInvitedBusinessProfileProps,
	): Promise<{ id: string }> {
		const [row] = await this.db
			.insert(businessProfile)
			.values({
				documentTypeId: data.documentTypeId,
				documentType: data.documentType,
				documentNumber: data.documentNumber,
				firstName: data.firstName ?? null,
				lastName: data.lastName ?? null,
				legalName: data.legalName ?? null,
				phonePrefixId: data.phonePrefixId ?? null,
				phonePrefix: data.phonePrefix ?? null,
				phoneNumber: data.phoneNumber ? data.phoneNumber : null,
				email: data.email,
				billingAddressId: data.billingAddressId,
				businessAccountId: data.businessAccountId,
				userId: data.userId,
				role: 'member',
				status: 'invited',
				roleTemplateId: data.roleTemplateId,
				isCustomized: data.isCustomized,
				invitedByUserId: data.invitedByUserId,
				invitedAt: data.invitedAt,
			})
			.returning({ id: businessProfile.id });
		return { id: row.id };
	}

	async activateByInvite(
		businessProfileId: string,
		userId: string,
		now: Date,
	): Promise<void> {
		await this.db
			.update(businessProfile)
			.set({ status: 'active', userId, acceptedAt: now })
			.where(
				and(
					eq(businessProfile.id, businessProfileId),
					eq(businessProfile.status, 'invited'),
				),
			);
	}

	async softDeleteByInviteRejection(
		businessProfileId: string,
		deletedByUserId: string,
		now: Date,
	): Promise<void> {
		await this.db
			.update(businessProfile)
			.set({ isDeleted: true, deletedByUserId, deletedAt: now })
			.where(eq(businessProfile.id, businessProfileId));
	}

	async findCollaboratorById(id: string): Promise<CollaboratorRecord | null> {
		const rows = await this.db
			.select({
				id: businessProfile.id,
				businessAccountId: businessProfile.businessAccountId,
				status: businessProfile.status,
				email: businessProfile.email,
				userId: businessProfile.userId,
			})
			.from(businessProfile)
			.where(
				and(
					eq(businessProfile.id, id),
					eq(businessProfile.role, 'member'),
					eq(businessProfile.isDeleted, false),
				),
			)
			.limit(1);
		return rows[0] ?? null;
	}

	async suspendCollaborator(
		id: string,
		suspendedByUserId: string,
		now: Date,
	): Promise<void> {
		await this.db
			.update(businessProfile)
			.set({ status: 'suspended', suspendedAt: now, suspendedByUserId })
			.where(
				and(
					eq(businessProfile.id, id),
					eq(businessProfile.role, 'member'),
					eq(businessProfile.status, 'active'),
					eq(businessProfile.isDeleted, false),
				),
			);
	}

	async reactivateCollaborator(id: string): Promise<void> {
		await this.db
			.update(businessProfile)
			.set({ status: 'active', suspendedAt: null, suspendedByUserId: null })
			.where(
				and(
					eq(businessProfile.id, id),
					eq(businessProfile.role, 'member'),
					eq(businessProfile.status, 'suspended'),
					eq(businessProfile.isDeleted, false),
				),
			);
	}

	async findProfileByUserId(userId: string): Promise<ProfileRecord | null> {
		const rows = await this.db
			.select({
				id: businessProfile.id,
				role: businessProfile.role,
				status: businessProfile.status,
				businessAccountId: businessProfile.businessAccountId,
			})
			.from(businessProfile)
			.where(
				and(
					eq(businessProfile.userId, userId),
					eq(businessProfile.isDeleted, false),
				),
			)
			.orderBy(asc(businessProfile.createdAt))
			.limit(1);
		const row = rows[0];
		if (!row) return null;
		return {
			id: row.id,
			role: row.role,
			status: row.status,
			businessAccountId: row.businessAccountId,
		};
	}

	async findProfileById(profileId: string): Promise<ProfileRecord | null> {
		const rows = await this.db
			.select({
				id: businessProfile.id,
				role: businessProfile.role,
				status: businessProfile.status,
				businessAccountId: businessProfile.businessAccountId,
			})
			.from(businessProfile)
			.where(
				and(
					eq(businessProfile.id, profileId),
					eq(businessProfile.isDeleted, false),
				),
			)
			.limit(1);
		const row = rows[0];
		if (!row) return null;
		return {
			id: row.id,
			role: row.role,
			status: row.status,
			businessAccountId: row.businessAccountId,
		};
	}

	async findCollaboratorForUpdate(
		collaboratorProfileId: string,
		businessAccountId: string,
	): Promise<CollaboratorForUpdateRecord | null> {
		const rows = await this.db
			.select({
				id: businessProfile.id,
				status: businessProfile.status,
				firstName: businessProfile.firstName,
				lastName: businessProfile.lastName,
				legalName: businessProfile.legalName,
				phonePrefixId: businessProfile.phonePrefixId,
				phonePrefix: businessProfile.phonePrefix,
				phoneNumber: businessProfile.phoneNumber,
				billingAddressId: businessProfile.billingAddressId,
				roleTemplateId: businessProfile.roleTemplateId,
			})
			.from(businessProfile)
			.where(
				and(
					eq(businessProfile.id, collaboratorProfileId),
					eq(businessProfile.businessAccountId, businessAccountId),
					eq(businessProfile.role, 'member'),
					eq(businessProfile.isDeleted, false),
				),
			)
			.limit(1)
			.for('update');

		const row = rows[0];
		if (!row) return null;

		return {
			id: row.id,
			status: row.status,
			firstName: row.firstName ?? null,
			lastName: row.lastName ?? null,
			legalName: row.legalName ?? null,
			phonePrefixId: row.phonePrefixId ?? null,
			phonePrefix: row.phonePrefix ?? null,
			phoneNumber: row.phoneNumber ?? null,
			billingAddressId: row.billingAddressId ?? null,
			roleTemplateId: row.roleTemplateId ?? null,
		};
	}

	async updateCollaboratorById(
		collaboratorProfileId: string,
		businessAccountId: string,
		fields: UpdateMemberFields,
	): Promise<void> {
		const updates: Record<string, unknown> = {};
		if (fields.firstName !== undefined) updates.firstName = fields.firstName;
		if (fields.lastName !== undefined) updates.lastName = fields.lastName;
		if (fields.legalName !== undefined) updates.legalName = fields.legalName;
		if (fields.phonePrefixId !== undefined)
			updates.phonePrefixId = fields.phonePrefixId;
		if (fields.phonePrefix !== undefined)
			updates.phonePrefix = fields.phonePrefix;
		if (fields.phoneNumber !== undefined)
			updates.phoneNumber = fields.phoneNumber ? fields.phoneNumber : null;
		if (fields.billingAddressId !== undefined)
			updates.billingAddressId = fields.billingAddressId;
		if (fields.isCustomized !== undefined)
			updates.isCustomized = fields.isCustomized;
		if (fields.roleTemplateId !== undefined)
			updates.roleTemplateId = fields.roleTemplateId;

		if (Object.keys(updates).length === 0) return;

		await this.db
			.update(businessProfile)
			.set(updates)
			.where(
				and(
					eq(businessProfile.id, collaboratorProfileId),
					eq(businessProfile.businessAccountId, businessAccountId),
					eq(businessProfile.role, 'member'),
					eq(businessProfile.isDeleted, false),
				),
			);
	}

	async removeCollaborator(
		id: string,
		deletedByUserId: string,
		now: Date,
	): Promise<void> {
		await this.db
			.update(businessProfile)
			.set({ isDeleted: true, deletedAt: now, deletedByUserId })
			.where(
				and(
					eq(businessProfile.id, id),
					eq(businessProfile.role, 'member'),
					eq(businessProfile.isDeleted, false),
				),
			);
	}

	async findNamesByIds(ids: string[]): Promise<Map<string, string | null>> {
		if (ids.length === 0) return new Map();
		const rows = await this.db
			.select({
				id: businessProfile.id,
				legalName: businessProfile.legalName,
			})
			.from(businessProfile)
			.where(
				and(
					inArray(businessProfile.id, ids),
					eq(businessProfile.isDeleted, false),
				),
			);
		const map = new Map<string, string | null>();
		for (const row of rows) {
			map.set(row.id, row.legalName);
		}
		return map;
	}
}
