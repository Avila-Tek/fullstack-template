import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type { CollaboratorEditContextRecord } from '../../application/ports/out/collaborator-edit-context-repository.port';
import { CollaboratorEditContextRepositoryPort } from '../../application/ports/out/collaborator-edit-context-repository.port';
import { address } from './address.schema';
import { businessProfile } from './business-profile.schema';
import { phonePrefixMaster } from './phone-prefix-master.schema';

@Injectable()
export class DrizzleCollaboratorEditContextRepository
	implements CollaboratorEditContextRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findByIdInAccount(
		collaboratorProfileId: string,
		businessAccountId: string,
	): Promise<CollaboratorEditContextRecord | null> {
		const rows = await this.db
			.select({
				businessAccountId: businessProfile.businessAccountId,
				documentType: businessProfile.documentType,
				documentNumber: businessProfile.documentNumber,
				firstName: businessProfile.firstName,
				lastName: businessProfile.lastName,
				legalName: businessProfile.legalName,
				accountEmail: businessProfile.email,
				phonePrefixValue: phonePrefixMaster.prefix,
				phoneNumber: businessProfile.phoneNumber,
				addressLine1: address.addressLine1,
				formattedAddress: address.formattedAddress,
				countryId: address.countryId,
				stateId: address.stateId,
				cityId: address.cityId,
				municipalityId: address.municipalityId,
				parishId: address.parishId,
				postalCodeId: address.postalCodeId,
			})
			.from(businessProfile)
			.leftJoin(address, eq(businessProfile.billingAddressId, address.id))
			.leftJoin(
				phonePrefixMaster,
				eq(businessProfile.phonePrefixId, phonePrefixMaster.id),
			)
			.where(
				and(
					eq(businessProfile.id, collaboratorProfileId),
					eq(businessProfile.businessAccountId, businessAccountId),
					eq(businessProfile.role, 'member'),
					eq(businessProfile.isDeleted, false),
				),
			)
			.limit(1);

		const row = rows[0];
		if (!row) return null;

		return {
			businessAccountId: row.businessAccountId,
			documentType: row.documentType,
			documentNumber: row.documentNumber,
			firstName: row.firstName ?? null,
			lastName: row.lastName ?? null,
			legalName: row.legalName ?? null,
			accountEmail: row.accountEmail ?? null,
			phonePrefixValue: row.phonePrefixValue ?? null,
			phoneNumber: row.phoneNumber ?? null,
			billingAddress: row.addressLine1
				? {
						addressLine1: row.addressLine1,
						formattedAddress: row.formattedAddress ?? null,
						countryId: row.countryId ?? null,
						stateId: row.stateId ?? null,
						cityId: row.cityId ?? null,
						municipalityId: row.municipalityId ?? null,
						parishId: row.parishId ?? null,
						postalCodeId: row.postalCodeId ?? null,
					}
				: null,
		};
	}
}
