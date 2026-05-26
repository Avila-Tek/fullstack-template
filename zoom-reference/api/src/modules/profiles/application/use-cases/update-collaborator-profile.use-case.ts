import { Inject, Injectable } from '@nestjs/common';
import type {
	TUpdateCollaboratorProfileCommand,
	TUpdateCollaboratorProfileOutput,
} from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { StateRepositoryPort } from '../../../region/application/ports/out/state-repository.port';
import { ProfileNotFoundException } from '../../../users/domain/exceptions/profile-not-found.exception';
import { AddressCountryIdMissingException } from '../../domain/exceptions/address-country-id-missing.exception';
import { UpdateCollaboratorProfileUseCasePort } from '../ports/in/update-collaborator-profile.use-case.port';
import { EditProfileUnitOfWorkPort } from '../ports/out/edit-profile-unit-of-work.port';

@Injectable()
export class UpdateCollaboratorProfileUseCase
	implements UpdateCollaboratorProfileUseCasePort
{
	constructor(
		@Inject(EditProfileUnitOfWorkPort)
		private readonly unitOfWork: EditProfileUnitOfWorkPort,
		@Inject(StateRepositoryPort)
		private readonly stateRepo: StateRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		cmd: TUpdateCollaboratorProfileCommand,
	): Promise<TUpdateCollaboratorProfileOutput> {
		this.logger.info(
			{
				event: 'collaborator_profile_update_attempted',
				userId: cmd.userId,
				businessAccountId: cmd.businessAccountId,
			},
			'Collaborator profile update attempted',
		);

		const updatedAt = await this.unitOfWork.run(
			async ({ address, businessProfile }) => {
				const existing = await businessProfile.findMemberForUpdate(
					cmd.userId,
					cmd.businessAccountId,
				);
				if (!existing) {
					throw new ProfileNotFoundException({
						userId: cmd.userId,
						businessAccountId: cmd.businessAccountId,
					});
				}

				let effectiveBillingAddressId = existing.billingAddressId;

				if (cmd.billingAddress !== undefined && cmd.billingAddress !== null) {
					let countryId = cmd.billingAddress.countryId;
					if (!countryId && cmd.billingAddress.stateId) {
						const state = await this.stateRepo.findById(
							cmd.billingAddress.stateId,
						);
						if (state) {
							countryId = state.countryId;
						}
					}

					if (!countryId) {
						throw new AddressCountryIdMissingException({
							userId: cmd.userId,
							businessAccountId: cmd.businessAccountId,
						});
					}

					const addressData = {
						formattedAddress:
							cmd.billingAddress.formattedAddress ??
							cmd.billingAddress.addressLine1,
						addressLine1: cmd.billingAddress.addressLine1,
						countryId,
						stateId: cmd.billingAddress.stateId,
						cityId: cmd.billingAddress.cityId,
						municipalityId: cmd.billingAddress.municipalityId ?? null,
						parishId: cmd.billingAddress.parishId ?? null,
						postalCodeId: cmd.billingAddress.postalCodeId ?? null,
						geoLat: cmd.billingAddress.geoLat ?? null,
						geoLng: cmd.billingAddress.geoLng ?? null,
						rawQuery: cmd.billingAddress.geoRawQuery ?? null,
						geolocationProvider: cmd.billingAddress.geoProviderType ?? null,
						providerRouteCode: cmd.billingAddress.geoRouteCode ?? null,
						providerAddressId: cmd.billingAddress.geoProviderAddressId ?? null,
						supportedByZoom: cmd.billingAddress.supportedByZoom ?? false,
						validatedAt: cmd.billingAddress.validatedAt
							? new Date(cmd.billingAddress.validatedAt)
							: null,
					};

					if (existing.billingAddressId) {
						await address.updateById(existing.billingAddressId, addressData);
					} else {
						const newAddr = await address.create(addressData);
						effectiveBillingAddressId = newAddr.id;
					}
				}

				const effectiveFirstName =
					cmd.firstName ?? existing.firstName ?? undefined;
				const effectiveLastName =
					cmd.lastName ?? existing.lastName ?? undefined;
				const nameWasSent =
					cmd.firstName !== undefined || cmd.lastName !== undefined;
				const derivedLegalName = nameWasSent
					? `${effectiveFirstName ?? ''} ${effectiveLastName ?? ''}`.trim() ||
						undefined
					: undefined;

				await businessProfile.updateMember(cmd.userId, cmd.businessAccountId, {
					firstName: effectiveFirstName,
					lastName: effectiveLastName,
					legalName:
						derivedLegalName ??
						cmd.legalName ??
						existing.legalName ??
						undefined,
					phonePrefixId:
						cmd.mobilePhone?.prefixId ?? existing.phonePrefixId ?? undefined,
					phonePrefix:
						cmd.mobilePhone?.prefixValue ?? existing.phonePrefix ?? undefined,
					phoneNumber:
						cmd.mobilePhone?.number ?? existing.phoneNumber ?? undefined,
					billingAddressId: effectiveBillingAddressId,
				});

				return new Date();
			},
		);

		this.logger.info(
			{
				event: 'collaborator_profile_updated',
				userId: cmd.userId,
				businessAccountId: cmd.businessAccountId,
			},
			'Collaborator profile updated successfully',
		);
		recordApiEvent('collaborator_profile_updated', {
			module: 'profiles',
			outcome: 'success',
		});

		return { updatedAt: updatedAt.toISOString() };
	}
}
