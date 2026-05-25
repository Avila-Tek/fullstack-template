import type { TGetReturnDataOutput } from '@zoom/schemas';
import type { ReturnPreferenceWithJoins } from '../ports/out/business-profile-return-preference-repository.port';

export function mapReturnPreferenceToOutput(
	pref: ReturnPreferenceWithJoins,
): TGetReturnDataOutput {
	return {
		returnType: {
			id: pref.returnTypeId,
			legacyId: pref.returnTypeLegacyId,
			name: pref.returnTypeName,
		},
		returnTo: pref.returnTo,
		address:
			pref.returnAddressId != null
				? {
						addressId: pref.returnAddressId,
						cityName: pref.cityName ?? '',
						stateName: pref.stateName ?? '',
						addressLine: pref.addressLine ?? '',
					}
				: null,
		office:
			pref.returnOfficeId != null
				? {
						officeId: pref.returnOfficeId,
						officeName: pref.officeName ?? '',
					}
				: null,
	};
}
