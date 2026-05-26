import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { ResolvedPermissions } from '../permissions/resolved-permissions.type';

/**
 * Injects the resolved permission snapshot for the current user into a
 * controller method parameter.
 *
 * PermissionsGuard must run before the controller for this to be populated.
 * Use this when the controller needs to filter or branch on specific permissions
 * beyond what @RequirePermissions() enforces at the guard level.
 *
 * @example
 * @Get('services')
 * listServices(@CurrentPermissions() perms: ResolvedPermissions) {
 *   return [...perms.services.values()].filter(s => s.enabled);
 * }
 */
export const CurrentPermissions = createParamDecorator(
	(_: unknown, ctx: ExecutionContext): ResolvedPermissions | undefined => {
		const request = ctx
			.switchToHttp()
			.getRequest<{ resolvedPermissions?: ResolvedPermissions }>();
		return request.resolvedPermissions;
	},
);
