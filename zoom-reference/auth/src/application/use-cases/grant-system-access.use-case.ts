import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { normalizeEmail } from '@zoom/utils';
import { SystemNotFoundException } from '../../domain/exceptions/system-not-found.exception';
import type {
	GrantSystemAccessCommand,
	GrantSystemAccessData,
	GrantSystemAccessResult,
} from '../ports/in/grant-system-access.use-case.port';
import { GrantSystemAccessUseCasePort } from '../ports/in/grant-system-access.use-case.port';
import { BetterAuthOrgPort } from '../ports/out/better-auth-org.port';
import { GrantAccessUnitOfWorkPort } from '../ports/out/grant-access-unit-of-work.port';
import { PasswordHashServicePort } from '../ports/out/password-hash-service.port';
import { SystemAuditLogPort } from '../ports/out/system-audit-log.port';
import { SystemMembershipRepositoryPort } from '../ports/out/system-membership-repository.port';
import { SystemRepositoryPort } from '../ports/out/system-repository.port';
import { UserRepositoryPort } from '../ports/out/user-repository.port';

@Injectable()
export class GrantSystemAccessUseCase implements GrantSystemAccessUseCasePort {
	constructor(
		private readonly systemRepo: SystemRepositoryPort,
		private readonly userRepo: UserRepositoryPort,
		private readonly membershipRepo: SystemMembershipRepositoryPort,
		private readonly baOrg: BetterAuthOrgPort,
		private readonly unitOfWork: GrantAccessUnitOfWorkPort,
		private readonly passwordHash: PasswordHashServicePort,
		private readonly auditLog: SystemAuditLogPort,
	) {}

	async execute(
		command: GrantSystemAccessCommand,
	): Promise<GrantSystemAccessResult> {
		const { systemId, callerUserId, email, role, ipAddress, userAgent } =
			command;

		const system = await this.systemRepo.findById(systemId);
		if (!system) {
			return { success: false, error: new SystemNotFoundException() };
		}

		const normalizedEmail = normalizeEmail(email);
		const user = await this.userRepo.findByNormalizedEmail(normalizedEmail);

		if (user) {
			return this.handlePathA({
				system,
				user,
				systemId,
				callerUserId,
				role,
				ipAddress,
				userAgent,
			});
		}

		return this.handlePathB({
			system,
			email,
			normalizedEmail,
			systemId,
			callerUserId,
			role,
			ipAddress,
			userAgent,
		});
	}

	private async handlePathA(params: {
		system: { id: string; organizationId: string };
		user: { id: string };
		systemId: string;
		callerUserId: string;
		role?: 'member' | 'admin';
		ipAddress: string;
		userAgent: string;
	}): Promise<GrantSystemAccessResult> {
		const { system, user, systemId, callerUserId, role, ipAddress, userAgent } =
			params;

		const existing = await this.membershipRepo.findByUserAndOrg(
			user.id,
			system.organizationId,
		);

		if (existing) {
			await this.auditLog.log({
				eventType: 'member_access_idempotent',
				systemId,
				targetUserId: user.id,
				ipAddress,
				userAgent,
				details: { actorUserId: callerUserId },
			});
			return {
				success: true,
				data: {
					path: 'existing',
					alreadyMember: true,
					userId: user.id,
					role: existing.role,
					profileId: existing.id,
				},
			};
		}

		const effectiveRole = role ?? 'member';

		const membership = await this.membershipRepo.insertMembership({
			userId: user.id,
			systemId,
			organizationId: system.organizationId,
			role: effectiveRole,
		});

		try {
			await this.baOrg.addMember({
				userId: user.id,
				role: effectiveRole,
				organizationId: system.organizationId,
			});
		} catch (err) {
			await this.membershipRepo.softDeleteByUser(user.id, systemId);
			await this.auditLog.log({
				eventType: 'member_access_grant_failed_path_a',
				systemId,
				targetUserId: user.id,
				ipAddress,
				userAgent,
				details: { actorUserId: callerUserId },
			});
			throw err;
		}

		await this.auditLog.log({
			eventType: 'member_access_granted_path_a',
			systemId,
			targetUserId: user.id,
			ipAddress,
			userAgent,
			details: { actorUserId: callerUserId, role: effectiveRole },
		});

		return {
			success: true,
			data: {
				path: 'existing',
				userId: user.id,
				role: membership.role,
				profileId: membership.id,
			},
		};
	}

	private async handlePathB(params: {
		system: { id: string; organizationId: string };
		email: string;
		normalizedEmail: string;
		systemId: string;
		callerUserId: string;
		role?: 'member' | 'admin';
		ipAddress: string;
		userAgent: string;
	}): Promise<GrantSystemAccessResult> {
		const {
			system,
			email,
			normalizedEmail,
			systemId,
			callerUserId,
			role,
			ipAddress,
			userAgent,
		} = params;

		const effectiveRole = role ?? 'member';

		let committed: GrantSystemAccessData | undefined;

		try {
			committed = await this.unitOfWork.run(
				async (repos): Promise<GrantSystemAccessData> => {
					const rawBytes = randomBytes(32);
					const passwordHashValue = await this.passwordHash.hash(
						rawBytes.toString('hex'),
					);
					rawBytes.fill(0);

					const newUser = await repos.user.createProvisioned({
						email: email.toLowerCase(),
						normalizedEmail,
						fullName: '',
					});

					await repos.account.createCredential({
						userId: newUser.id,
						passwordHash: passwordHashValue,
					});

					const membership = await repos.membership.insertMembership({
						userId: newUser.id,
						systemId,
						organizationId: system.organizationId,
						role: effectiveRole,
					});

					return {
						path: 'provisioned',
						userId: newUser.id,
						role: membership.role,
						profileId: membership.id,
					};
				},
			);

			await this.baOrg.addMember({
				userId: committed.userId,
				role: effectiveRole,
				organizationId: system.organizationId,
			});

			await this.auditLog.log({
				eventType: 'member_access_granted_path_b',
				systemId,
				targetUserId: committed.userId,
				ipAddress,
				userAgent,
				details: { actorUserId: callerUserId, role: committed.role },
			});

			return { success: true, data: committed };
		} catch (err) {
			await this.auditLog.log({
				eventType: 'member_access_grant_failed_path_b',
				systemId,
				targetUserId: committed?.userId,
				ipAddress,
				userAgent,
				details: { actorUserId: callerUserId },
			});
			throw err;
		}
	}
}
