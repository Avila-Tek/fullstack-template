import { Inject, Injectable } from '@nestjs/common';
import type { TEditContextResponse } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { AccountDataInconsistentException } from '../../../users/domain/exceptions/account-data-inconsistent.exception';
import { ProfileNotFoundException } from '../../../users/domain/exceptions/profile-not-found.exception';
import { ProfileSuspendedException } from '../../../users/domain/exceptions/profile-suspended.exception';
import { GetEditContextUseCasePort } from '../ports/in/get-edit-context.use-case.port';
import { AddressRepositoryPort } from '../ports/out/address-repository.port';
import { BusinessAccountRepositoryPort } from '../ports/out/business-account-repository.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';

@Injectable()
export class GetEditContextUseCase implements GetEditContextUseCasePort {
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly businessProfileRepo: BusinessProfileRepositoryPort,
		@Inject(BusinessAccountRepositoryPort)
		private readonly businessAccountRepo: BusinessAccountRepositoryPort,
		@Inject(AddressRepositoryPort)
		private readonly addressRepo: AddressRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	private async getAccountContextOrThrow(
		businessAccountId: string,
		userId: string,
	) {
		const accountContext =
			await this.businessAccountRepo.findEditContextById(businessAccountId);
		if (!accountContext) {
			this.logger.error(
				{ event: 'edit_context_account_inconsistent', userId },
				'Business account row missing',
			);
			throw new AccountDataInconsistentException({ userId });
		}
		return accountContext;
	}

	async execute(userId: string): Promise<TEditContextResponse> {
		const profile =
			await this.businessProfileRepo.findProfileDetailByUserId(userId);

		if (!profile) {
			this.logger.warn(
				{ event: 'edit_context_profile_not_found', userId },
				'No business profile found for user',
			);
			throw new ProfileNotFoundException({ userId });
		}

		if (profile.status === 'suspended') {
			this.logger.warn(
				{ event: 'edit_context_profile_suspended', userId },
				'Profile is suspended',
			);
			throw new ProfileSuspendedException({ userId });
		}

		if (!profile.businessAccountId) {
			throw new AccountDataInconsistentException({ userId });
		}

		if (profile.role === 'member') {
			const memberAccountContext = await this.getAccountContextOrThrow(
				profile.businessAccountId,
				userId,
			);

			let memberBillingAddress: TEditContextResponse['billingAddress'] = null;
			if (profile.billingAddressId) {
				const addr = await this.addressRepo.findById(profile.billingAddressId);
				if (!addr) {
					this.logger.error(
						{
							event: 'edit_context_address_inconsistent',
							userId,
						},
						'Billing address row missing despite FK',
					);
					throw new AccountDataInconsistentException({ userId });
				}
				memberBillingAddress = addr;
			}

			this.logger.info(
				{
					event: 'edit_context_loaded',
					userId,
					role: 'member',
					businessAccountId: profile.businessAccountId,
					coreClientCode: memberAccountContext.coreClientCode,
				},
				'Edit context loaded',
			);

			return {
				role: 'member',
				businessAccountId: profile.businessAccountId,
				ownerBusinessProfileId: profile.id,
				coreClientCode: memberAccountContext.coreClientCode,
				accountEmail: profile.email,
				accountFirstName: profile.firstName,
				accountLastName: profile.lastName,
				accountLegalName: profile.legalName,
				documentType: profile.documentType,
				documentNumber: profile.documentNumber,
				phonePrefixId: profile.phonePrefixId,
				phonePrefixValue: profile.phonePrefix,
				phoneNumber: profile.phoneNumber,
				billingAddress: memberBillingAddress,
			};
		}

		const accountContext = await this.getAccountContextOrThrow(
			profile.businessAccountId,
			userId,
		);

		let billingAddress: TEditContextResponse['billingAddress'] = null;
		if (profile.billingAddressId) {
			const addr = await this.addressRepo.findById(profile.billingAddressId);
			if (!addr) {
				this.logger.error(
					{
						event: 'edit_context_address_inconsistent',
						userId,
					},
					'Billing address row missing despite FK',
				);
				throw new AccountDataInconsistentException({ userId });
			}
			billingAddress = addr;
		}

		this.logger.info(
			{ event: 'edit_context_loaded', userId, role: profile.role },
			'Edit context loaded',
		);

		return {
			role: 'owner',
			businessAccountId: profile.businessAccountId,
			ownerBusinessProfileId: profile.id,
			coreClientCode: accountContext.coreClientCode,
			accountEmail: accountContext.email,
			accountFirstName: accountContext.firstName,
			accountLastName: accountContext.lastName,
			accountLegalName: accountContext.legalName,
			documentType: profile.documentType,
			documentNumber: profile.documentNumber,
			phonePrefixId: accountContext.phonePrefixId,
			phonePrefixValue: accountContext.phonePrefix,
			phoneNumber: accountContext.phoneNumber,
			billingAddress,
		};
	}
}
