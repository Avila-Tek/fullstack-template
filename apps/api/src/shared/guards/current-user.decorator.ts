import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface JwtUser {
	sub: string;
	email: string;
	scope?: string;
	sid?: string;
}

/** Injects the validated JWT payload as a typed user object into a controller method parameter. */
export const CurrentUser = createParamDecorator(
	(_: unknown, ctx: ExecutionContext): JwtUser => {
		const request = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
		return request.user;
	},
);
