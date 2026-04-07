import {
	type CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtUser } from './current-user.decorator';
import { REQUIRED_SCOPE_KEY } from './require-scope.decorator';

/** Checks that the JWT scope claim satisfies the @RequireScope() requirement. */
@Injectable()
export class ScopeGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredScope = this.reflector.getAllAndOverride<string | undefined>(
			REQUIRED_SCOPE_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (!requiredScope) return true;

		const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
		const user = request.user;

		if (!user?.scope) {
			throw new ForbiddenException('Insufficient scope.');
		}

		const userScopes = user.scope.split(' ');
		if (!userScopes.includes(requiredScope)) {
			throw new ForbiddenException('Insufficient scope.');
		}

		return true;
	}
}
