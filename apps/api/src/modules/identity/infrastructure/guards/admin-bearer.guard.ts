import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

// Guards admin endpoints against unauthorized access using a shared secret.
// Pass via: Authorization: Bearer <ADMIN_SECRET>
@Injectable()
export class AdminBearerGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const req = context.switchToHttp().getRequest<Request>();
		const header = req.headers.authorization ?? '';
		const [scheme, token] = header.split(' ');

		const adminSecret = process.env.ADMIN_SECRET;
		if (!adminSecret)
			throw new UnauthorizedException('Admin access not configured.');

		if (scheme !== 'Bearer' || token !== adminSecret) {
			throw new UnauthorizedException('Invalid admin credentials.');
		}

		return true;
	}
}
