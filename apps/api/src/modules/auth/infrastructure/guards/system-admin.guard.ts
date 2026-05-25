import type { IncomingMessage } from 'node:http';
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { SystemMembershipRepositoryPort } from '../../application/ports/out/system-membership-repository.port';
import { SystemRepositoryPort } from '../../application/ports/out/system-repository.port';
import { NotSystemAdminException } from '../../domain/exceptions/not-system-admin.exception';
import { SystemNotFoundException } from '../../domain/exceptions/system-not-found.exception';
import { auth } from '../better-auth/auth';

type RequestWithParams = IncomingMessage & {
	params: Record<string, string>;
	[key: string]: unknown;
};

@Injectable()
export class SystemAdminGuard implements CanActivate {
	constructor(
		private readonly systemRepo: SystemRepositoryPort,
		private readonly membershipRepo: SystemMembershipRepositoryPort,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<RequestWithParams>();

		const session = await auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});

		if (!session?.user) {
			throw new UnauthorizedException();
		}

		const systemId = req.params.id;

		if (!systemId) {
			throw new SystemNotFoundException();
		}

		const system = await this.systemRepo.findById(systemId);
		if (!system) {
			throw new SystemNotFoundException();
		}

		const membership = await this.membershipRepo.findByUserAndOrg(
			session.user.id,
			system.organizationId,
		);

		if (
			!membership ||
			membership.role === 'member' ||
			membership.status !== 'active'
		) {
			throw new NotSystemAdminException();
		}

		req.resolvedSystem = system;
		req.callerMembership = membership;

		return true;
	}
}
