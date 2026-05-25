import { SetMetadata } from '@nestjs/common';
import type { TPermissionKey, TShippingServiceKey } from '@zoom/schemas';

export interface PermissionRequirement {
	services?: TShippingServiceKey[];
	functional?: TPermissionKey[];
	/** Default: 'AND' — all listed permissions must pass. */
	operator?: 'AND' | 'OR';
}

export const REQUIRE_PERMISSIONS_KEY = Symbol('requirePermissions');

/**
 * Declare which permissions are required to access a route or controller.
 * Pairs with PermissionsGuard (registered as APP_GUARD).
 *
 * @example
 * // Require a specific service to be enabled
 * @RequirePermissions({ services: ['national_guia_origin'] })
 *
 * // Require a functional permission
 * @RequirePermissions({ functional: ['view_reports'] })
 *
 * // At least one of the listed services must be enabled
 * @RequirePermissions({ operator: 'OR', services: ['national_guia_origin', 'international'] })
 */
export const RequirePermissions = (requirement: PermissionRequirement) =>
	SetMetadata(REQUIRE_PERMISSIONS_KEY, requirement);
