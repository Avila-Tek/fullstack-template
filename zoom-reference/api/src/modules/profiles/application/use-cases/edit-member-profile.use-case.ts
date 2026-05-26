import { Inject, Injectable } from '@nestjs/common';
import type {
	TEditMemberProfileCommand,
	TEditMemberProfileOutput,
} from '@zoom/schemas';
import { computeIsCustomized } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { CollaboratorInactiveException } from '../../../members/domain/exceptions/collaborator-inactive.exception';
import { MemberAtLeastOneServiceRequiredException } from '../../../members/domain/exceptions/member-at-least-one-service-required.exception';
import { MemberProfileNotFoundException } from '../../../members/domain/exceptions/member-profile-not-found.exception';
import { MembersOwnerOnlyException } from '../../../members/domain/exceptions/members-owner-only.exception';
import { StateRepositoryPort } from '../../../region/application/ports/out/state-repository.port';
import { AddressCountryIdMissingException } from '../../domain/exceptions/address-country-id-missing.exception';
import { EditMemberProfileUseCasePort } from '../ports/in/edit-member-profile.use-case.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import { EditProfileUnitOfWorkPort } from '../ports/out/edit-profile-unit-of-work.port';
import { RoleTemplateDefaultsRepositoryPort } from '../ports/out/role-template-defaults-repository.port';

@Injectable()
export class EditMemberProfileUseCase implements EditMemberProfileUseCasePort {
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
		@Inject(EditProfileUnitOfWorkPort)
		private readonly unitOfWork: EditProfileUnitOfWorkPort,
		@Inject(StateRepositoryPort)
		private readonly stateRepo: StateRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
		@Inject(RoleTemplateDefaultsRepositoryPort)
		private readonly roleTemplateDefaultsRepo: RoleTemplateDefaultsRepositoryPort,
	) {}

	async execute(
		command: TEditMemberProfileCommand,
	): Promise<TEditMemberProfileOutput> {
		const owner = await this.profileRepo.findOwnerByUserId(
			command.callerUserId,
		);
		if (!owner) {
			throw new MembersOwnerOnlyException();
		}

		const { businessAccountId } = owner;

		// A10 guard: validate at least one service enabled before entering transaction
		if (command.permissions) {
			const enabledCount = command.permissions.servicePermissions.filter(
				(s) => s.enabled,
			).length;
			if (enabledCount === 0) {
				throw new MemberAtLeastOneServiceRequiredException();
			}
		}

		const updatedAt = await this.unitOfWork.run(
			async ({
				address,
				businessProfile,
				businessProfileService,
				businessProfilePermission,
			}) => {
				const collaborator = await businessProfile.findCollaboratorForUpdate(
					command.collaboratorProfileId,
					businessAccountId,
				);
				if (!collaborator) {
					throw new MemberProfileNotFoundException();
				}

				if (collaborator.status !== 'active') {
					throw new CollaboratorInactiveException();
				}

				let effectiveBillingAddressId = collaborator.billingAddressId;

				if (command.billingAddress !== undefined) {
					let countryId = command.billingAddress.countryId;
					if (!countryId && command.billingAddress.stateId) {
						const state = await this.stateRepo.findById(
							command.billingAddress.stateId,
						);
						if (state) {
							countryId = state.countryId;
						}
					}
					if (!countryId) {
						throw new AddressCountryIdMissingException({
							collaboratorProfileId: command.collaboratorProfileId,
						});
					}

					const addressData = {
						formattedAddress:
							command.billingAddress.formattedAddress ??
							command.billingAddress.addressLine1,
						addressLine1: command.billingAddress.addressLine1,
						countryId,
						stateId: command.billingAddress.stateId ?? null,
						cityId: command.billingAddress.cityId ?? null,
						municipalityId: command.billingAddress.municipalityId ?? null,
						parishId: command.billingAddress.parishId ?? null,
						postalCodeId: command.billingAddress.postalCodeId ?? null,
						rawQuery: command.billingAddress.rawQuery ?? null,
						geoLat:
							command.billingAddress.geoLat != null
								? String(command.billingAddress.geoLat)
								: null,
						geoLng:
							command.billingAddress.geoLng != null
								? String(command.billingAddress.geoLng)
								: null,
						geolocationProvider:
							command.billingAddress.geolocationProvider ?? null,
						providerAddressId: command.billingAddress.providerAddressId ?? null,
						providerRouteCode: command.billingAddress.providerRouteCode ?? null,
						supportedByZoom: command.billingAddress.supportedByZoom ?? false,
						validatedAt: command.billingAddress.validatedAt ?? null,
					};

					if (collaborator.billingAddressId) {
						await address.updateById(
							collaborator.billingAddressId,
							addressData,
						);
					} else {
						const newAddr = await address.create(addressData);
						effectiveBillingAddressId = newAddr.id;
					}
				}

				let permissionUpdateFields: {
					isCustomized?: boolean;
					roleTemplateId?: string | null;
				} = {};

				if (command.permissions) {
					// Resolve which template to compare against
					const templateId =
						command.permissions.roleTemplateId ?? collaborator.roleTemplateId;
					const template = templateId
						? await this.roleTemplateDefaultsRepo.findWithDefaults(templateId)
						: null;

					const isCustomized = computeIsCustomized(
						command.permissions.servicePermissions,
						template?.services ?? null,
					);

					// Upsert service rows; tuple mapping handled atomically inside adapter
					await businessProfileService.upsertAllForProfile(
						command.collaboratorProfileId,
						command.permissions.servicePermissions.map((svc) => ({
							key: svc.key,
							enabled: svc.enabled,
							whitelistEnabled: svc.whitelistEnabled,
							recipientIds: svc.recipientIds,
						})),
					);

					// Replace functional permissions
					await businessProfilePermission.upsertAllForProfile(
						command.collaboratorProfileId,
						command.permissions.functionalPermissions.map((p) => ({
							key: p.key,
							allowed: p.allowed,
						})),
					);

					permissionUpdateFields = {
						isCustomized,
						roleTemplateId: templateId ?? null,
					};
				}

				await businessProfile.updateCollaboratorById(
					command.collaboratorProfileId,
					businessAccountId,
					{
						firstName: command.firstName,
						lastName: command.lastName,
						legalName: command.legalName,
						phonePrefixId: command.mobilePhone?.prefixId,
						phonePrefix: command.mobilePhone?.prefixValue,
						phoneNumber: command.mobilePhone?.number,
						billingAddressId: effectiveBillingAddressId,
						...permissionUpdateFields,
					},
				);

				return new Date();
			},
		);

		const changedFields = {
			name: !!(command.firstName || command.lastName || command.legalName),
			phone: !!command.mobilePhone,
			address: !!command.billingAddress,
			permissions: !!command.permissions,
		};

		this.logger.info(
			{
				event: 'collaborator_personal_info_updated',
				callerUserId: command.callerUserId,
				collaboratorProfileId: command.collaboratorProfileId,
				businessAccountId,
				changedFields,
			},
			'Collaborator personal info updated',
		);

		return { updatedAt: updatedAt.toISOString() };
	}
}
