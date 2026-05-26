import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../../env';
import type { JwtUser } from './current-user.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

interface RawJwtPayload {
	sub?: string;
	email?: string;
	org_id?: string;
	role?: string;
	scope?: string;
	sid?: string;
}

/**
 * Global guard that validates ES256 JWTs issued by apps/auth.
 * - JWKS keys are fetched live from AUTH_JWKS_URL with automatic in-process caching.
 * - Validates ES256 algorithm, issuer (AUTH_ISSUER), and audience (AUTH_AUDIENCE).
 * - Routes/controllers decorated with @Public() bypass this guard entirely.
 * - On success, sets request.user to { sub, email, orgId, role, scope, sid }.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
	private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

	constructor(private readonly reflector: Reflector) {
		this.jwks = createRemoteJWKSet(new URL(env.AUTH_JWKS_URL));
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const request = context
			.switchToHttp()
			.getRequest<{ headers: { authorization?: string }; user: JwtUser }>();

		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith('Bearer ')) {
			throw new UnauthorizedException('Missing authorization token.');
		}

		const token = authHeader.slice(7);
		try {
			const { payload } = await jwtVerify<RawJwtPayload>(token, this.jwks, {
				algorithms: ['ES256'],
				issuer: env.AUTH_ISSUER,
				audience: env.AUTH_AUDIENCE.split(',').map((s) => s.trim()),
			});

			if (!payload.sub || !payload.email) {
				throw new UnauthorizedException('Missing required token claims.');
			}

			request.user = {
				sub: payload.sub,
				email: payload.email,
				orgId: payload.org_id ?? '',
				role: payload.role ?? '',
				scope: payload.scope,
				sid: payload.sid,
			};

			// Attach verified identity to the active Sentry isolation scope so
			// any error captured later in the request chain carries user.id and
			// user.email. Only verified claims (post jwtVerify) reach this line.
			Sentry.getCurrentScope().setUser({
				id: payload.sub,
				email: payload.email,
			});

			return true;
		} catch (err) {
			// Write to stderr so the error is always visible in Cloud Run logs
			// regardless of the OTEL/Pino transport configuration.
			process.stderr.write(
				`[JwtAuthGuard] verification failed: ${err instanceof Error ? err.message : String(err)}\n`,
			);
			throw new UnauthorizedException('Invalid or expired token.');
		}
	}
}
