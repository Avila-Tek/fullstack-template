import type { IncomingMessage } from 'node:http';
import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Post,
	Req,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import { ApiErrorResponses, ApiSafeResponse } from '@zoom/swagger';
import { z } from 'zod';
import type { ForceRevokeSessionsData } from '../../application/ports/in/force-revoke-sessions.use-case.port';
import { ForceRevokeSessionsUseCasePort } from '../../application/ports/in/force-revoke-sessions.use-case.port';
import { ListUserSessionsUseCasePort } from '../../application/ports/in/list-user-sessions.use-case.port';
import type { SessionDto } from '../../application/ports/out/session-repository.port';
import { resolveClientIpFromRequest } from '../../shared/utils/resolve-client-ip';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';

type SessionData = { user: { id: string } } | null;

const revokeBody = z.object({
	reason: z.string().max(255).optional(),
});

const revokeResponse = z.object({
	userId: z.string(),
	sessionsRevokedCount: z.number(),
	sessionInvalidBeforeUpdated: z.literal(true),
	twoFactorForced: z.boolean(),
});

const sessionItemResponse = z.object({
	id: z.string(),
	userId: z.string(),
	createdAt: z.date(),
	expiresAt: z.date(),
	ipAddress: z.string().nullable(),
	userAgent: z.string().nullable(),
	activeOrganizationId: z.string().nullable(),
});

const listSessionsResponse = z.object({
	userId: z.string(),
	sessions: z.array(sessionItemResponse),
});

@ApiTags('Admin Sessions')
@Controller('admin/users/:userId/sessions')
@UseGuards(PlatformAdminGuard)
export class AdminSessionsController {
	constructor(
		private readonly forceRevokeUseCase: ForceRevokeSessionsUseCasePort,
		private readonly listSessionsUseCase: ListUserSessionsUseCasePort,
	) {}

	@Post('revoke')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Force revoke all sessions for a user (platform admin only)',
		description:
			'Atomically deletes all sessions, updates sessionInvalidBefore, ' +
			'and force-enables email OTP 2FA if no active method exists. ' +
			'A security notification email is sent after the transaction commits.',
	})
	@ApiSafeResponse(revokeResponse, 200, 'Sessions revoked successfully')
	@ApiErrorResponses(400, 401, 403, 404)
	async revoke(
		@Session() session: SessionData,
		@Param('userId') targetUserId: string,
		@Body() body: unknown,
		@Req() req: IncomingMessage,
	): Promise<ForceRevokeSessionsData> {
		const callerUserId = session?.user?.id;
		if (!callerUserId) throw new UnauthorizedException();

		const parsed = revokeBody.safeParse(body);
		const reason = parsed.success ? parsed.data.reason : undefined;

		const result = await this.forceRevokeUseCase.execute({
			targetUserId,
			platformAdminUserId: callerUserId,
			reason,
			ipAddress: resolveClientIpFromRequest(req),
			userAgent: req.headers['user-agent'] ?? 'unknown',
		});

		if (!result.success) throw result.error;

		return result.data;
	}

	@Get()
	@ApiOperation({
		summary: 'List all sessions for a user (platform admin only)',
	})
	@ApiSafeResponse(listSessionsResponse, 200, 'User sessions')
	@ApiErrorResponses(401, 403, 404)
	async list(
		@Session() session: SessionData,
		@Param('userId') targetUserId: string,
	): Promise<{ userId: string; sessions: SessionDto[] }> {
		const callerUserId = session?.user?.id;
		if (!callerUserId) throw new UnauthorizedException();

		const result = await this.listSessionsUseCase.execute({
			targetUserId,
			callerUserId,
		});

		if (!result.success) throw result.error;

		return { userId: targetUserId, sessions: result.data };
	}
}
