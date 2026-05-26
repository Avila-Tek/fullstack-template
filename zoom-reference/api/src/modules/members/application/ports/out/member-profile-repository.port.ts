export interface MemberProfileRecord {
	profile: {
		firstName: string | null;
		lastName: string | null;
		legalName: string | null;
		email: string | null;
		phoneNumber: string | null;
		phonePrefixId: string | null;
		phonePrefix: string | null;
		documentTypeId: string;
		documentType: string;
		documentNumber: string;
	};
	address: {
		billingAddressLine1: string | null;
		billingAddressCountryId: string | null;
		billingAddressStateId: string | null;
		billingAddressCityId: string | null;
		countryText: string | null;
		stateText: string | null;
		cityText: string | null;
	};
	role: 'owner' | 'member';
	status: 'active' | 'invited' | 'suspended';
	roleTemplateName: string | null;
}

export abstract class MemberProfileRepositoryPort {
	abstract findByIdInAccount(
		profileId: string,
		businessAccountId: string,
	): Promise<MemberProfileRecord | null>;
}
