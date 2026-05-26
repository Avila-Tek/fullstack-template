import { Inject, Injectable } from '@nestjs/common';
import type {
	TPersistInvitationCommand,
	TPersistInvitationOutput,
} from '@zoom/schemas';
import { computeIsCustomized } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { EmailServicePort } from '../../../email/application/ports/out/email.service.port';
import { InvitationAtLeastOneServiceRequiredException } from '../../domain/exceptions/invitation-at-least-one-service-required.exception';
import { InviteToken } from '../../domain/value-objects/invite-token.value-object';
import { PersistInvitationUseCasePort } from '../ports/in/persist-invitation.use-case.port';
import { InvitationRoleTemplateRepositoryPort } from '../ports/out/invitation-role-template-repository.port';
import {
	type InvitationRepos,
	InvitationUnitOfWorkPort,
} from '../ports/out/invitation-unit-of-work.port';

@Injectable()
export class PersistInvitationUseCase implements PersistInvitationUseCasePort {
	constructor(
		@Inject(InvitationUnitOfWorkPort)
		private readonly unitOfWork: InvitationUnitOfWorkPort,
		@Inject(InvitationRoleTemplateRepositoryPort)
		private readonly roleTemplateRepo: InvitationRoleTemplateRepositoryPort,
		@Inject(EmailServicePort)
		private readonly emailService: EmailServicePort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		cmd: TPersistInvitationCommand,
	): Promise<TPersistInvitationOutput> {
		const enabledCount = cmd.permissions.servicePermissions.filter(
			(s) => s.enabled,
		).length;
		if (enabledCount === 0) {
			throw new InvitationAtLeastOneServiceRequiredException();
		}

		// Load template defaults before the transaction (read-only, safe outside tx)
		const templateDefaults = cmd.permissions.roleTemplateId
			? await this.roleTemplateRepo.findWithDefaults(
					cmd.permissions.roleTemplateId,
				)
			: null;

		const isCustomized = computeIsCustomized(
			cmd.permissions.servicePermissions,
			templateDefaults?.services ?? null,
		);
		const token = InviteToken.generate();

		const { businessProfileId, inviteId } = await this.unitOfWork.run((repos) =>
			this.runTransaction(repos, cmd, token.hash, isCustomized),
		);

		void this.emailService
			.sendInvitationEmail(cmd.profile.email, token.plaintext)
			.then(() => {
				this.logger.info(
					{ event: 'invitation.persist.email_sent', inviteId },
					'Invitation email sent',
				);
				recordApiEvent('invitation.persist.email_sent', {
					module: 'invitations',
					outcome: 'success',
				});
			})
			.catch(() => {
				this.logger.warn(
					{
						event: 'invitation.persist.email_failed',
						inviteId,
					},
					'Invitation email delivery failed — invite remains active',
				);
				recordApiEvent('invitation.persist.email_failed', {
					module: 'invitations',
					outcome: 'failure',
				});
			});

		return { businessProfileId, inviteId };
	}

	private async runTransaction(
		repos: InvitationRepos,
		cmd: TPersistInvitationCommand,
		tokenHash: string,
		isCustomized: boolean,
	): Promise<{ businessProfileId: string; inviteId: string }> {
		const { profile, billingAddress, permissions } = cmd;

		// Step 1: Create billing address
		const { id: billingAddressId } = await repos.address.create({
			formattedAddress:
				billingAddress.formattedAddress ?? billingAddress.addressLine1,
			addressLine1: billingAddress.addressLine1,
			addressLine2: billingAddress.addressLine2,
			suburbText: billingAddress.suburbText,
			postalCodeText: billingAddress.postalCodeText,
			internationalCityText: billingAddress.internationalCityText,
			countryId: billingAddress.countryId,
			stateId: billingAddress.stateId,
			cityId: billingAddress.cityId,
			municipalityId: billingAddress.municipalityId,
			parishId: billingAddress.parishId,
			postalCodeId: billingAddress.postalCodeId,
			rawQuery: billingAddress.rawQuery,
			geoLat:
				billingAddress.geoLat != null
					? String(billingAddress.geoLat)
					: undefined,
			geoLng:
				billingAddress.geoLng != null
					? String(billingAddress.geoLng)
					: undefined,
			geolocationProvider: billingAddress.geolocationProvider,
			providerAddressId: billingAddress.providerAddressId,
			providerRouteCode: billingAddress.providerRouteCode,
			supportedByZoom: billingAddress.supportedByZoom,
			validatedAt: billingAddress.validatedAt,
		});

		// Step 2: Create business_profile with status 'invited'
		const { id: businessProfileId } = await repos.businessProfile.createInvited(
			{
				documentTypeId: profile.documentTypeId,
				documentType: profile.documentType,
				documentNumber: profile.documentNumber,
				firstName: profile.firstName,
				lastName: profile.lastName,
				legalName: profile.legalName,
				phonePrefixId: profile.phonePrefixId,
				phonePrefix: profile.phonePrefix,
				phoneNumber: profile.phoneNumber,
				email: profile.normalizedEmail,
				billingAddressId,
				businessAccountId: cmd.businessAccountId,
				userId: profile.userId,
				roleTemplateId: permissions.roleTemplateId,
				isCustomized,
				invitedByUserId: cmd.createdByUserId,
				invitedAt: new Date(),
			},
		);

		// Step 3: Create business_account_invite (pending, with token hash)
		const { id: inviteId } = await repos.invitation.create({
			businessAccountId: cmd.businessAccountId,
			businessProfileId,
			email: profile.email,
			normalizedEmail: profile.normalizedEmail,
			role: 'member',
			status: 'pending',
			tokenHash,
			createdByUserId: cmd.createdByUserId,
		});

		// Step 4: Upsert business_profile_service rows (whitelist entries included atomically)
		await repos.businessProfileService.upsertAllForProfile(
			businessProfileId,
			permissions.servicePermissions.map((svc) => ({
				key: svc.key,
				enabled: svc.enabled,
				whitelistEnabled: svc.whitelistEnabled,
				recipientIds: svc.recipientIds,
			})),
		);

		// Step 5: Upsert business_profile_permission rows
		await repos.businessProfilePermission.upsertAllForProfile(
			businessProfileId,
			permissions.functionalPermissions.map((perm) => ({
				key: perm.key,
				allowed: perm.allowed,
			})),
		);

		return { businessProfileId, inviteId };
	}
}
