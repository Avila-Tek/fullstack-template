import {
	Body,
	Controller,
	HttpCode,
	Post,
	UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { changePasswordInput } from '@repo/schemas';
import { Session } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { SessionNotFreshException } from '@/modules/identity/domain/exceptions/session-not-fresh.exception';
import {
	ApiBearerSession,
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodBody,
} from '@/shared/swagger/swagger';
import { ChangePasswordUseCasePort } from '../../../application/ports/in/change-password.use-case.port';

const FRESHNESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

type SessionData = { user: { id: string }; session: { createdAt: Date } } | null;

class ChangePasswordDto {
	static readonly schema = changePasswordInput;
	currentPassword!: string;
	newPassword!: string;
}

// Spec §18: authenticated endpoint — requires valid session.
// Verifies current password, enforces complexity + history, revokes all sessions.
// Strict rate limit: 5 requests per 10 minutes per IP.
@ApiTags('Auth / Password')
@Controller('change-password')
export class ChangePasswordController {
	constructor(private readonly changePassword: ChangePasswordUseCasePort) {}

	@Post()
	@HttpCode(200)
	@Throttle({ default: { ttl: 600_000, limit: 5 } })
	@ApiBearerSession()
	@ApiOperation({
		summary: "Change the authenticated user's password",
		description:
			'Validates the current password, enforces complexity rules and reuse history, ' +
			'then updates the password and revokes all existing sessions. ' +
			'Rate limited to 5 requests per 10 minutes per IP. ' +
			'Returns 422 if the new password was recently used or fails complexity requirements.',
	})
	@ApiZodBody(changePasswordInput, 'Current and new password')
	@ApiSafeResponse(
		z.object({ success: z.literal(true) }),
		200,
		'Password changed successfully',
	)
	@ApiErrorResponses(400, 401, 403, 422, 429)
	async execute(
		@Session() session: SessionData,
		@Body() body: ChangePasswordDto,
	): Promise<null> {
		const userId = session?.user.id;
		if (!userId) throw new UnauthorizedException();

		const createdAt = new Date(session.session.createdAt).getTime();
		if (Date.now() - createdAt >= FRESHNESS_WINDOW_MS) {
			throw new SessionNotFreshException();
		}

		const result = await this.changePassword.execute(
			userId,
			body.currentPassword,
			body.newPassword,
		);

		if (!result.success) throw result.error;

		return result.data;
	}
}
