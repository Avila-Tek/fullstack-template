import type { TPermissionKey, TShippingServiceKey } from '@zoom/schemas';

export interface ResolvedServicePermission {
	key: TShippingServiceKey;
	enabled: boolean;
	whitelistEnabled: boolean;
	/** Number of whitelisted recipients. Null when whitelistEnabled is false. */
	recipientCount: number | null;
}

export interface ResolvedFunctionalPermission {
	key: TPermissionKey;
	allowed: boolean;
}

/**
 * Internal permission snapshot for the current authenticated user.
 * Used by PermissionsGuard and @CurrentPermissions() — independent of
 * the TMemberPermissionsRead API response DTO.
 */
export interface ResolvedPermissions {
	services: ReadonlyMap<TShippingServiceKey, ResolvedServicePermission>;
	functional: ReadonlyMap<TPermissionKey, ResolvedFunctionalPermission>;
}
