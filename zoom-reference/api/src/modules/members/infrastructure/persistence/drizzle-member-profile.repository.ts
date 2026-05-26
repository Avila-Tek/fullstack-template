import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { address } from '../../../profiles/infrastructure/persistence/address.schema';
import { businessProfile } from '../../../profiles/infrastructure/persistence/business-profile.schema';
import { roleTemplate } from '../../../profiles/infrastructure/persistence/role-template.schema';
import { cityMaster } from '../../../region/infrastructure/persistence/city-master.schema';
import { countryMaster } from '../../../region/infrastructure/persistence/country-master.schema';
import { stateMaster } from '../../../region/infrastructure/persistence/state-master.schema';
import type {
	MemberProfileRecord,
	MemberProfileRepositoryPort,
} from '../../application/ports/out/member-profile-repository.port';

@Injectable()
export class DrizzleMemberProfileRepository
	implements MemberProfileRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findByIdInAccount(
		profileId: string,
		businessAccountId: string,
	): Promise<MemberProfileRecord | null> {
		const rows = await this.db
			.select({
				firstName: businessProfile.firstName,
				lastName: businessProfile.lastName,
				legalName: businessProfile.legalName,
				email: businessProfile.email,
				phoneNumber: businessProfile.phoneNumber,
				phonePrefixId: businessProfile.phonePrefixId,
				phonePrefix: businessProfile.phonePrefix,
				documentTypeId: businessProfile.documentTypeId,
				documentType: businessProfile.documentType,
				documentNumber: businessProfile.documentNumber,
				role: businessProfile.role,
				status: businessProfile.status,
				billingAddressLine1: address.addressLine1,
				billingAddressCountryId: address.countryId,
				billingAddressStateId: address.stateId,
				billingAddressCityId: address.cityId,
				countryText: countryMaster.name,
				stateText: stateMaster.name,
				cityText: cityMaster.name,
				roleTemplateName: roleTemplate.name,
			})
			.from(businessProfile)
			.leftJoin(address, eq(businessProfile.billingAddressId, address.id))
			.leftJoin(countryMaster, eq(address.countryId, countryMaster.id))
			.leftJoin(stateMaster, eq(address.stateId, stateMaster.id))
			.leftJoin(cityMaster, eq(address.cityId, cityMaster.id))
			.leftJoin(
				roleTemplate,
				and(
					eq(businessProfile.roleTemplateId, roleTemplate.id),
					eq(roleTemplate.isDeleted, false),
				),
			)
			.where(
				and(
					eq(businessProfile.id, profileId),
					eq(businessProfile.businessAccountId, businessAccountId),
					eq(businessProfile.isDeleted, false),
				),
			)
			.limit(1);

		const row = rows[0];
		if (!row) return null;

		return {
			profile: {
				firstName: row.firstName ?? null,
				lastName: row.lastName ?? null,
				legalName: row.legalName ?? null,
				email: row.email ?? null,
				phoneNumber: row.phoneNumber ?? null,
				phonePrefixId: row.phonePrefixId ?? null,
				phonePrefix: row.phonePrefix ?? null,
				documentTypeId: row.documentTypeId,
				documentType: row.documentType,
				documentNumber: row.documentNumber,
			},
			address: {
				billingAddressLine1: row.billingAddressLine1 ?? null,
				billingAddressCountryId: row.billingAddressCountryId ?? null,
				billingAddressStateId: row.billingAddressStateId ?? null,
				billingAddressCityId: row.billingAddressCityId ?? null,
				countryText: row.countryText ?? null,
				stateText: row.stateText ?? null,
				cityText: row.cityText ?? null,
			},
			role: row.role,
			status: row.status,
			roleTemplateName: row.roleTemplateName ?? null,
		};
	}
}
