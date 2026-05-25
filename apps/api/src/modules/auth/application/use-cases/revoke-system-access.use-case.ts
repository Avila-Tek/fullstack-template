import { Injectable } from '@nestjs/common';
import { CannotRemoveOwnerException } from '../../domain/exceptions/cannot-remove-owner.exception';
import { MemberNotFoundException } from '../../domain/exceptions/member-not-found.exception';
import type {
	RevokeSystemAccessCommand,
	RevokeSystemAccessResult,
} from '../ports/in/revoke-system-access.use-case.port';
import { RevokeSystemAccessUseCasePort } from '../ports/in/revoke-system-access.use-case.port';
import { BetterAuthOrgPort } from '../ports/out/better-auth-org.port';
import { SystemAuditLogPort } from '../ports/out/system-audit-log.port';
import { SystemMembershipRepositoryPort } from '../ports/out/system-membership-repository.port';

@Injectable()
export class RevokeSystemAccessUseCase
	implements RevokeSystemAccessUseCasePort
{
	constructor(
		private readonly membershipRepo: SystemMembershipRepositoryPort,
		private readonly baOrg: BetterAuthOrgPort,
		private readonly auditLog: SystemAuditLogPort,
	) {}

	async execute(
		command: RevokeSystemAccessCommand,
	): Promise<RevokeSystemAccessResult> {
		const {
			systemId,
			organizationId,
			callerUserId,
			targetUserId,
			ipAddress,
			userAgent,
			headers,
		} = command;

		const existing = await this.membershipRepo.findByUserAndOrg(
			targetUserId,
			organizationId,
		);

		if (!existing) {
			return { success: false, error: new MemberNotFoundException() };
		}

		if (existing.role === 'owner') {
			return { success: false, error: new CannotRemoveOwnerException() };
		}

		const deleted = await this.membershipRepo.softDeleteByUser(
			targetUserId,
			systemId,
		);

		if (!deleted) {
			return { success: false, error: new MemberNotFoundException() };
		}

		const baMemberId = await this.baOrg.findBaMemberByUserAndOrg(
			targetUserId,
			organizationId,
		);

		if (baMemberId) {
			await this.baOrg.removeMember({
				memberIdOrEmail: baMemberId,
				organizationId,
				headers,
			});
		}

		await this.auditLog.log({
			eventType: 'member_access_revoked',
			systemId,
			targetUserId,
			ipAddress,
			userAgent,
			details: { actorUserId: callerUserId },
		});

		return { success: true, data: undefined };
	}
}
