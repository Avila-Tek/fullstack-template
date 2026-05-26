import { Inject, Injectable } from '@nestjs/common';
import type {
	TUpdateBusinessAccountCommand,
	TUpdateBusinessAccountOutput,
} from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { StateRepositoryPort } from '../../../region/application/ports/out/state-repository.port';
import { AddressCountryIdMissingException } from '../../domain/exceptions/address-country-id-missing.exception';
import { BusinessAccountForbiddenException } from '../../domain/exceptions/business-account-forbidden.exception';
import { BusinessAccountNotFoundException } from '../../domain/exceptions/business-account-not-found.exception';
import { UpdateBusinessAccountUseCasePort } from '../ports/in/update-business-account.use-case.port';
import { EditProfileUnitOfWorkPort } from '../ports/out/edit-profile-unit-of-work.port';

@Injectable()
export class UpdateBusinessAccountUseCase
	implements UpdateBusinessAccountUseCasePort
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
		cmd: TUpdateBusinessAccountCommand,
	): Promise<TUpdateBusinessAccountOutput> {
		this.logger.info(
			{
				event: 'business_account_update_attempted',
				userId: cmd.userId,
				businessAccountId: cmd.businessAccountId,
			},
			'Business account update attempted',
		);
		const updatedAt = await this.unitOfWork.run(
			async ({ address, businessAccount, businessProfile }) => {
				const current = await businessAccount.findByIdForUpdate(
					cmd.businessAccountId,
				);
				if (!current || current.isDeleted) {
					throw new BusinessAccountNotFoundException({
						businessAccountId: cmd.businessAccountId,
					});
				}

				const ownerProfile = await businessProfile.findOwnerForUpdate(
					cmd.userId,
					cmd.businessAccountId,
				);
				if (!ownerProfile) {
					throw new BusinessAccountForbiddenException({
						userId: cmd.userId,
						businessAccountId: cmd.businessAccountId,
					});
				}

				let effectiveBillingAddressId = current.billingAddressId;

				if (cmd.billingAddress !== null && cmd.billingAddress !== undefined) {
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
						stateId: cmd.billingAddress.stateId ?? null,
						cityId: cmd.billingAddress.cityId ?? null,
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

					if (current.billingAddressId) {
						await address.updateById(current.billingAddressId, addressData);
					} else {
						const newAddr = await address.create(addressData);
						effectiveBillingAddressId = newAddr.id;
					}
				}

				const effectiveFirstName = cmd.firstName ?? current.firstName ?? null;
				const effectiveLastName = cmd.lastName ?? current.lastName ?? null;

				// Only derive legalName when firstName or lastName is explicitly sent.
				const nameWasSent =
					cmd.firstName !== undefined || cmd.lastName !== undefined;
				const derivedName = nameWasSent
					? `${effectiveFirstName ?? ''} ${effectiveLastName ?? ''}`.trim()
					: null;

				const updateFields = {
					legalName: derivedName ?? cmd.legalName ?? current.legalName,
					firstName: effectiveFirstName,
					lastName: effectiveLastName,
					phonePrefixId: cmd.mobilePhone?.prefixId ?? current.phonePrefixId,
					phonePrefix: cmd.mobilePhone?.prefixValue ?? current.phonePrefix,
					phoneNumber: cmd.mobilePhone?.number ?? current.phoneNumber,
					billingAddressId: effectiveBillingAddressId,
				};

				await businessAccount.updateEditable(
					cmd.businessAccountId,
					updateFields,
				);

				await businessProfile.updateOwnerSync(
					cmd.userId,
					cmd.businessAccountId,
					updateFields,
				);

				return new Date();
			},
		);

		this.logger.info(
			{
				event: 'business_account_updated',
				userId: cmd.userId,
				businessAccountId: cmd.businessAccountId,
			},
			'Business account updated successfully',
		);
		recordApiEvent('business_account_updated', {
			module: 'profiles',
			outcome: 'success',
		});

		return { updatedAt: updatedAt.toISOString() };
	}
}
