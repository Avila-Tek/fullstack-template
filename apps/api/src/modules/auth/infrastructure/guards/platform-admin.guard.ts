import type { IncomingMessage } from 'node:http';
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { NotPlatformAdminException } from '../../domain/exceptions/not-platform-admin.exception';
import { auth } from '../better-auth/auth';

type PlatformAdminUser = { id: string; platformAdmin?: boolean };
type SessionWithPlatformAdmin = { user: PlatformAdminUser } | null;

// Guards routes that require platform-admin privileges.
// Reads the active Better Auth session and checks the platformAdmin flag
// that was set at sign-up / via seed script. Throws NotPlatformAdminException
// (→ 403) if the flag is absent or false.
@Injectable()
export class PlatformAdminGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<IncomingMessage>();

		const session = (await auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		})) as SessionWithPlatformAdmin;

		if (!session?.user?.platformAdmin) {
			throw new NotPlatformAdminException();
		}

		return true;
	}
}
