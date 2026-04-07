import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { importSPKI, jwtVerify } from 'jose';
import type { JwtUser } from './current-user.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

interface RawJwtPayload {
	sub?: string;
	email?: string;
	scope?: string;
	sid?: string;
}

/**
 * Global guard that validates RS256 JWTs issued by Better Auth (now co-located).
 * - Uses AUTH_PUBLIC_KEY (PEM-encoded RS256 public key) — no remote JWKS fetch.
 * - Routes/controllers decorated with @Public() bypass this guard entirely.
 * - On success, sets request.user to { sub, email, scope, sid }.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
	private keyPromise: Promise<Awaited<ReturnType<typeof importSPKI>>> | null =
		null;

	constructor(private readonly reflector: Reflector) {}

	private getKey(): Promise<Awaited<ReturnType<typeof importSPKI>>> {
		if (!this.keyPromise) {
			const pem = process.env.AUTH_PUBLIC_KEY ?? '';
			this.keyPromise = importSPKI(pem, 'RS256');
		}
		return this.keyPromise;
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
			const key = await this.getKey();
			const { payload } = await jwtVerify<RawJwtPayload>(token, key, {
				algorithms: ['RS256'],
			});

			if (!payload.sub || !payload.email) {
				throw new UnauthorizedException('Invalid token claims.');
			}

			request.user = {
				sub: payload.sub,
				email: payload.email,
				scope: payload.scope,
				sid: payload.sid,
			};

			return true;
		} catch (err) {
			if (err instanceof UnauthorizedException) throw err;
			throw new UnauthorizedException('Invalid or expired token.');
		}
	}
}
