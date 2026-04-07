import { SetMetadata } from '@nestjs/common';

export const REQUIRED_SCOPE_KEY = Symbol('requiredScope');

/**
 * Require a specific OAuth scope on a route or controller.
 * Pairs with ScopeGuard.
 *
 * @example
 * @RequireScope('users.read')
 */
export const RequireScope = (scope: string) =>
	SetMetadata(REQUIRED_SCOPE_KEY, scope);
