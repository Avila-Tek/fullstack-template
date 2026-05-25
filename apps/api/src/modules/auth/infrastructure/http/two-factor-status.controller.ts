import {
	Controller,
	Get,
	Inject,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TwoFactorRepositoryPort } from '../../application/ports/out/two-factor-repository.port';
import { type AuthSessionUser, AuthUser } from '../guards/auth-user.decorator';
import { SessionGuard } from '../guards/session.guard';

@ApiBearerAuth()
@ApiTags('Auth / Two-Factor')
@Controller('two-factor')
export class TwoFactorStatusController {
	constructor(
		@Inject(TwoFactorRepositoryPort)
		private readonly twoFactorRepo: TwoFactorRepositoryPort,
	) {}

	@Get('status')
	@UseGuards(SessionGuard)
	@ApiOperation({
		summary: 'Get 2FA status for the current user',
		description:
			'Returns whether the authenticated user has an active 2FA method enabled ' +
			'and which method is currently configured.',
	})
	async getStatus(
		@AuthUser() user: AuthSessionUser,
	): Promise<{ enabled: boolean; method: 'sms' | 'totp' | 'email' | null }> {
		if (!user) throw new UnauthorizedException();

		const row = await this.twoFactorRepo.findEnabledByUserId(user.id);
		if (!row) return { enabled: false, method: null };
		return { enabled: true, method: row.method };
	}
}
