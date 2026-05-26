import type { TPermissionKey } from '@zoom/schemas';

export interface BusinessProfilePermissionProps {
	key: TPermissionKey;
	allowed: boolean;
}

export abstract class BusinessProfilePermissionRepositoryPort {
	abstract upsertAllForProfile(
		businessProfileId: string,
		data: BusinessProfilePermissionProps[],
	): Promise<void>;

	abstract findAllForProfile(
		businessProfileId: string,
	): Promise<Array<{ key: TPermissionKey; allowed: boolean }>>;
}
