import type { IncomingMessage } from 'node:http';
import {
	Controller,
	Get,
	HttpCode,
	Inject,
	NotFoundException,
	Post,
	Req,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import {
	activeTermsResponse,
	type TTermsAcceptanceResponse,
	type TTermsAcceptanceStatusResponse,
	termsAcceptanceResponseSchema,
	termsAcceptanceStatusResponseSchema,
} from '@zoom/schemas';
import { ApiErrorResponses, ApiSafeResponse } from '@zoom/swagger';
import { AcceptTermsUseCasePort } from '../../application/ports/in/accept-terms.use-case.port';
import { GetTermsAcceptanceStatusUseCasePort } from '../../application/ports/in/get-terms-acceptance-status.use-case.port';
import type { SystemContext } from '../../application/ports/out/system-key-service.port';
import {
	type ActiveTermsRecord,
	TermsRepositoryPort,
} from '../../application/ports/out/terms-repository.port';
import { resolveClientIpFromRequest } from '../../shared/utils/resolve-client-ip';
import { type AuthSessionUser, AuthUser } from '../guards/auth-user.decorator';
import { SessionGuard } from '../guards/session.guard';

type RequestWithSystemContext = IncomingMessage & {
	systemContext?: SystemContext;
};

type ActiveTermsResponse = ActiveTermsRecord;

// @AllowAnonymous() is the class-level default (public routes).
// Individual methods that require an authenticated session override this with @UseGuards(SessionGuard).
@ApiTags('Auth / Terms')
@Controller('terms')
@AllowAnonymous()
export class TermsController {
	constructor(
		@Inject(TermsRepositoryPort)
		private readonly termsRepo: TermsRepositoryPort,
		@Inject(GetTermsAcceptanceStatusUseCasePort)
		private readonly getTermsStatusUseCase: GetTermsAcceptanceStatusUseCasePort,
		@Inject(AcceptTermsUseCasePort)
		private readonly acceptTermsUseCase: AcceptTermsUseCasePort,
	) {}

	@Get('active')
	@ApiOperation({
		summary: 'Get active terms of service for a system',
		description:
			'Returns the currently active terms of service for the system identified ' +
			'by the system key in the x-system-key header.',
	})
	@ApiSafeResponse(activeTermsResponse, 200, 'Active terms of service')
	@ApiErrorResponses(401, 404)
	async getActiveTerms(
		@Req() req: RequestWithSystemContext,
	): Promise<ActiveTermsResponse> {
		if (!req.systemContext?.systemId) throw new UnauthorizedException();
		const systemId = req.systemContext.systemId;

		const terms = await this.termsRepo.findActiveBySystemId(systemId);
		if (!terms) throw new NotFoundException();

		return {
			id: terms.id,
			version: terms.version,
			title: terms.title,
			content: terms.content,
			effectiveAt: terms.effectiveAt,
		};
	}

	@Get('acceptance/status')
	@UseGuards(SessionGuard)
	@ApiOperation({ summary: 'Check T&C acceptance status for the current user' })
	@ApiSafeResponse(termsAcceptanceStatusResponseSchema, 200)
	@ApiErrorResponses(401, 500)
	async getAcceptanceStatus(
		@AuthUser() user: AuthSessionUser,
		@Req() req: RequestWithSystemContext,
	): Promise<TTermsAcceptanceStatusResponse> {
		if (!req.systemContext?.systemId) throw new UnauthorizedException();
		return this.getTermsStatusUseCase.execute({
			userId: user.id,
			systemId: req.systemContext.systemId,
		});
	}

	@Post('acceptance')
	@UseGuards(SessionGuard)
	@HttpCode(200)
	@ApiOperation({ summary: 'Record user acceptance of the active terms' })
	@ApiSafeResponse(termsAcceptanceResponseSchema, 200)
	@ApiErrorResponses(401, 404, 500)
	async acceptTerms(
		@AuthUser() user: AuthSessionUser,
		@Req() req: RequestWithSystemContext & {
			headers: { 'user-agent'?: string };
		},
	): Promise<TTermsAcceptanceResponse> {
		if (!req.systemContext?.systemId) throw new UnauthorizedException();
		const rawIp = resolveClientIpFromRequest(req);
		return this.acceptTermsUseCase.execute({
			userId: user.id,
			systemId: req.systemContext.systemId,
			sessionId: user.sessionId,
			ipAddress: rawIp !== 'unknown' ? rawIp : null,
			userAgent: req.headers['user-agent'] ?? null,
		});
	}
}
