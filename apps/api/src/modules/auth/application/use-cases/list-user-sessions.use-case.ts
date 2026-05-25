import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import {
	type ListUserSessionsCommand,
	type ListUserSessionsResult,
	ListUserSessionsUseCasePort,
} from '../ports/in/list-user-sessions.use-case.port';
import { SessionRepositoryPort } from '../ports/out/session-repository.port';
import { SystemAuditLogPort } from '../ports/out/system-audit-log.port';
import { UserRepositoryPort } from '../ports/out/user-repository.port';

@Injectable()
export class ListUserSessionsUseCase implements ListUserSessionsUseCasePort {
	constructor(
		private readonly userRepo: UserRepositoryPort,
		private readonly sessionRepo: SessionRepositoryPort,
		private readonly auditLog: SystemAuditLogPort,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {}

	async execute(
		command: ListUserSessionsCommand,
	): Promise<ListUserSessionsResult> {
		const { targetUserId, callerUserId } = command;

		const user = await this.userRepo.findById(targetUserId);
		if (!user) {
			this.logger.warn(
				{
					event: 'auth.admin.list_sessions_error',
					callerUserId,
					targetUserId,
					errorCode: 'AUTH_USER_NOT_FOUND',
				},
				'Target user not found for session listing',
			);
			return {
				success: false,
				error: new UserNotFoundException({ targetUserId }),
			};
		}

		const sessions = await this.sessionRepo.findAllForUser(targetUserId);

		await this.auditLog.log({
			eventType: 'admin_sessions_listed',
			platformAdminUserId: callerUserId,
			targetUserId,
			details: { sessionCount: sessions.length },
		});

		this.logger.info(
			{
				event: 'auth.admin.list_sessions_success',
				callerUserId,
				targetUserId,
				sessionCount: sessions.length,
			},
			'Admin listed user sessions',
		);

		return { success: true, data: sessions };
	}
}
