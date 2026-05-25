import { Inject, Injectable } from '@nestjs/common';
import type { TMemberPermissionsRead } from '@zoom/schemas';
import { SHIPPING_SERVICE_KEY_TUPLES } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { GetMemberPermissionsForbiddenException } from '../../domain/exceptions/get-member-permissions-forbidden.exception';
import { PermissionResolver } from '../permission-resolver.service';
import type { GetMemberPermissionsCommand } from '../ports/in/get-member-permissions.use-case.port';
import { GetMemberPermissionsUseCasePort } from '../ports/in/get-member-permissions.use-case.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';

@Injectable()
export class GetMemberPermissionsUseCase
	implements GetMemberPermissionsUseCasePort
{
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
		@Inject(PermissionResolver)
		private readonly permissionResolver: PermissionResolver,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		command: GetMemberPermissionsCommand,
	): Promise<TMemberPermissionsRead> {
		const { requestingUserId, targetProfileId } = command;

		const requestingProfile =
			await this.profileRepo.findProfileByUserId(requestingUserId);

		if (!requestingProfile || requestingProfile.status !== 'active') {
			throw new GetMemberPermissionsForbiddenException();
		}

		const targetProfile =
			await this.profileRepo.findProfileById(targetProfileId);

		if (!targetProfile) {
			throw new GetMemberPermissionsForbiddenException();
		}

		const isSelf = requestingProfile.id === targetProfileId;
		const isOwnerInSameAccount =
			requestingProfile.role === 'owner' &&
			requestingProfile.businessAccountId === targetProfile.businessAccountId;

		if (!isSelf && !isOwnerInSameAccount) {
			throw new GetMemberPermissionsForbiddenException();
		}

		const resolved =
			await this.permissionResolver.resolveForProfile(targetProfile);

		this.logger.info(
			{
				event: 'member_permissions_loaded',
				role: targetProfile.role,
				serviceCount: resolved.services.size,
				functionalCount: resolved.functional.size,
			},
			'Member permissions loaded',
		);

		return {
			servicePermissions: [...resolved.services.values()].map((s) => ({
				key: s.key,
				...SHIPPING_SERVICE_KEY_TUPLES[s.key],
				enabled: s.enabled,
				whitelistEnabled: s.whitelistEnabled,
				recipientCount: s.recipientCount,
			})),
			functionalPermissions: [...resolved.functional.values()].map((f) => ({
				key: f.key,
				allowed: f.allowed,
			})),
		};
	}
}
