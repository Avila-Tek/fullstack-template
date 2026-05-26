import { Injectable } from '@nestjs/common';
import { CannotRemoveOwnerException } from '../../domain/exceptions/cannot-remove-owner.exception';
import { MemberNotFoundException } from '../../domain/exceptions/member-not-found.exception';
import type {
	UpdateMemberRoleCommand,
	UpdateMemberRoleResult,
} from '../ports/in/update-member-role.use-case.port';
import { UpdateMemberRoleUseCasePort } from '../ports/in/update-member-role.use-case.port';
import { BetterAuthOrgPort } from '../ports/out/better-auth-org.port';
import { SystemAuditLogPort } from '../ports/out/system-audit-log.port';
import { SystemMembershipRepositoryPort } from '../ports/out/system-membership-repository.port';

@Injectable()
export class UpdateMemberRoleUseCase implements UpdateMemberRoleUseCasePort {
	constructor(
		private readonly membershipRepo: SystemMembershipRepositoryPort,
		private readonly baOrg: BetterAuthOrgPort,
		private readonly auditLog: SystemAuditLogPort,
	) {}

	async execute(
		command: UpdateMemberRoleCommand,
	): Promise<UpdateMemberRoleResult> {
		const {
			systemId,
			organizationId,
			callerUserId,
			targetUserId,
			role,
			ipAddress,
			userAgent,
			headers,
		} = command;

		const current = await this.membershipRepo.findByUserAndOrg(
			targetUserId,
			organizationId,
		);

		if (!current) {
			return { success: false, error: new MemberNotFoundException() };
		}

		if (current.role === 'owner') {
			return { success: false, error: new CannotRemoveOwnerException() };
		}

		const oldRole = current.role;

		const updated = await this.membershipRepo.updateMemberRole(
			targetUserId,
			systemId,
			role,
		);

		if (!updated) {
			return { success: false, error: new MemberNotFoundException() };
		}

		const baMemberId = await this.baOrg.findBaMemberByUserAndOrg(
			targetUserId,
			current.organizationId,
		);

		if (baMemberId) {
			try {
				await this.baOrg.updateMemberRole({
					memberId: baMemberId,
					role,
					organizationId: current.organizationId,
					headers,
				});
			} catch (err) {
				await this.membershipRepo.updateMemberRole(
					targetUserId,
					systemId,
					oldRole,
				);
				await this.auditLog.log({
					eventType: 'member_role_update_failed',
					systemId,
					targetUserId,
					ipAddress,
					userAgent,
					details: { actorUserId: callerUserId, oldRole, newRole: role },
				});
				throw err;
			}
		}

		await this.auditLog.log({
			eventType: 'member_role_updated',
			systemId,
			targetUserId,
			ipAddress,
			userAgent,
			details: { actorUserId: callerUserId, oldRole, newRole: role },
		});

		return { success: true, data: undefined };
	}
}
