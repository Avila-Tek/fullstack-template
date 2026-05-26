export interface NewBusinessProfileReturnPreferenceProps {
	businessProfileId: string;
	returnTypeId: string;
	returnTo: 'address' | 'office' | null;
	returnAddressId?: string | null;
	returnOfficeId?: string | null;
	lockerMasterId?: string | null;
	notes?: string | null;
}

export interface ReturnPreferenceWithJoins {
	id: string;
	returnTypeId: string;
	returnTypeLegacyId: number;
	returnTypeName: string;
	returnTo: 'address' | 'office' | null;
	returnAddressId: string | null;
	addressLine: string | null;
	cityName: string | null;
	stateName: string | null;
	returnOfficeId: string | null;
	officeName: string | null;
}

export interface UpdateReturnPreferenceProps {
	returnTypeId: string;
	returnTo: 'address' | 'office' | null;
	returnAddressId: string | null;
	returnOfficeId: string | null;
}

export abstract class BusinessProfileReturnPreferenceRepositoryPort {
	abstract create(
		data: NewBusinessProfileReturnPreferenceProps,
	): Promise<{ id: string }>;

	abstract findByBusinessProfileId(
		businessProfileId: string,
	): Promise<ReturnPreferenceWithJoins | null>;

	abstract updateByBusinessProfileId(
		businessProfileId: string,
		data: UpdateReturnPreferenceProps,
	): Promise<void>;
}
