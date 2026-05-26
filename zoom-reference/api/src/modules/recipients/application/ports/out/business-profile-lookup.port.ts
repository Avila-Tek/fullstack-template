export interface BusinessProfileRecord {
	id: string;
	role: 'owner' | 'member';
	businessAccountId: string;
}

export abstract class BusinessProfileLookupPort {
	abstract findProfileByUserId(
		userId: string,
	): Promise<BusinessProfileRecord | null>;
}
