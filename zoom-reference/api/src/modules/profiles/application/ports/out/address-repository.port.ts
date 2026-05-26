export interface NewAddressProps {
	formattedAddress: string;
	addressLine1: string;
	addressLine2?: string | null;
	rawQuery?: string | null;
	suburbText?: string | null;
	postalCodeText?: string | null;
	internationalCityText?: string | null;
	countryId?: string | null;
	countryCode?: string | null;
	countryName?: string | null;
	stateId?: string | null;
	cityId?: string | null;
	municipalityId?: string | null;
	parishId?: string | null;
	postalCodeId?: string | null;
	geoLat?: string | null;
	geoLng?: string | null;
	geolocationProvider?: string | null;
	providerAddressId?: string | null;
	providerRouteCode?: string | null;
	supportedByZoom?: boolean | null;
	validatedAt?: Date | null;
}

export interface EditContextAddressRecord {
	id: string;
	countryId: string | null;
	stateId: string | null;
	cityId: string | null;
	municipalityId: string | null;
	parishId: string | null;
	postalCodeId: string | null;
	addressLine1: string;
	formattedAddress: string;
}

export interface ResolvedAddressRecord {
	id: string;
	addressLine: string;
	cityName: string | null;
	stateName: string | null;
}

export abstract class AddressRepositoryPort {
	abstract create(data: NewAddressProps): Promise<{ id: string }>;

	abstract findById(id: string): Promise<EditContextAddressRecord | null>;

	abstract updateById(id: string, data: NewAddressProps): Promise<void>;

	abstract findResolvedById(id: string): Promise<ResolvedAddressRecord | null>;
}
