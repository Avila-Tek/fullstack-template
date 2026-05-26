import type { TPermissionKey, TShippingServiceKey } from '@zoom/schemas';

export interface RoleTemplateDefaultsRecord {
	id: string;
	services: Array<{ key: TShippingServiceKey; enabled: boolean }>;
	permissions: Array<{ key: TPermissionKey; allowed: boolean }>;
}

export abstract class InvitationRoleTemplateRepositoryPort {
	/** Returns null when the template does not exist or is deleted. */
	abstract findWithDefaults(
		id: string,
	): Promise<RoleTemplateDefaultsRecord | null>;
}
