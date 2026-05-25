import {
	createParamDecorator,
	type ExecutionContext,
	UnauthorizedException,
} from '@nestjs/common';

export interface AuthSessionUser {
	id: string;
	sessionId: string;
}

export const AuthUser = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): AuthSessionUser => {
		const req = ctx.switchToHttp().getRequest<{ authUser?: AuthSessionUser }>();
		if (!req.authUser) throw new UnauthorizedException();
		return req.authUser;
	},
);
