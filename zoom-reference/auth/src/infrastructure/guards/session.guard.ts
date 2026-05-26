import type { IncomingMessage } from 'node:http';
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../better-auth/auth';
import type { AuthSessionUser } from './auth-user.decorator';

type RequestWithAuthUser = IncomingMessage & { authUser?: AuthSessionUser };

@Injectable()
export class SessionGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<RequestWithAuthUser>();

		const session = await auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});

		if (!session?.user?.id) throw new UnauthorizedException();

		req.authUser = { id: session.user.id, sessionId: session.session.id };
		return true;
	}
}
