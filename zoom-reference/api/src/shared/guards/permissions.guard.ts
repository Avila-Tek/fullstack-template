import {
	type CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionResolver } from '../../modules/profiles/application/permission-resolver.service';
import type { ResolvedPermissions } from '../permissions/resolved-permissions.type';
import type { JwtUser } from './current-user.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { PermissionRequirement } from './require-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from './require-permissions.decorator';

interface PermissionRequest {
	user?: JwtUser;
	resolvedPermissions?: ResolvedPermissions;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly resolver: PermissionResolver,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (isPublic) return true;

		const request = context.switchToHttp().getRequest<PermissionRequest>();

		if (!request.user) return true;

		const resolved = await this.resolver.resolve(request.user.sub);
		request.resolvedPermissions = resolved;

		const requirement = this.reflector.getAllAndOverride<
			PermissionRequirement | undefined
		>(REQUIRE_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

		if (!requirement) return true;

		if (!this.satisfies(resolved, requirement)) {
			throw new ForbiddenException('Insufficient permissions.');
		}

		return true;
	}

	private satisfies(
		resolved: ResolvedPermissions,
		requirement: PermissionRequirement,
	): boolean {
		const op = requirement.operator ?? 'AND';

		const checks: boolean[] = [
			...(requirement.services ?? []).map(
				(key) => resolved.services.get(key)?.enabled ?? false,
			),
			...(requirement.functional ?? []).map(
				(key) => resolved.functional.get(key)?.allowed ?? false,
			),
		];

		if (checks.length === 0) return true;

		return op === 'AND' ? checks.every(Boolean) : checks.some(Boolean);
	}
}
