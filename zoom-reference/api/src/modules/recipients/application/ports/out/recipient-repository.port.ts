export interface NewRecipientProps {
	businessAccountId: string;
	ownerBusinessProfileId: string;
	isBusinessAccountOwner: boolean;
	deliveryType: 'guia' | 'locker';
	serviceScope: 'national' | 'international';
	status: 'active' | 'suspended';
	name: string;
	alias?: string;
	contactName?: string;
	documentTypeId?: string;
	documentType?: string;
	documentNumber?: string;
	internationalDocument?: string;
	cellphonePrefixId?: string;
	cellphonePrefix?: string;
	cellphoneNumber?: string;
	phonePrefixId?: string;
	phonePrefix?: string;
	phoneNumber?: string;
	internationalCellphonePrefixId?: string;
	internationalCellphonePrefix?: string;
	internationalPhonePrefixId?: string;
	internationalPhonePrefix?: string;
	email?: string;
	addressId?: string;
	locality?: string;
	observation?: string;
	lockerMasterId?: string;
	lockerPrefix?: string;
	lockerCode?: string;
}

export interface RecipientRecord {
	id: string;
	businessAccountId: string;
	name: string;
	alias: string | null;
	deliveryType: 'guia' | 'locker';
	serviceScope: 'national' | 'international';
	status: 'active' | 'suspended';
	createdAt: Date;
}

export interface RecipientListFilter {
	businessAccountId: string;
	callerProfileId: string;
	callerRole: 'owner' | 'member';
	hasShareGuide: boolean;
	hasShareLocker: boolean;
	recipientType?: 'guia' | 'locker';
	serviceScope?: 'national' | 'international';
	status: 'active' | 'suspended' | 'all';
	starred?: boolean;
	search?: string;
	page: number;
	limit: number;
}

export interface RecipientListRow {
	id: string;
	alias: string | null;
	name: string;
	recipientType: 'guia' | 'locker';
	serviceScope: 'national' | 'international';
	status: 'active' | 'suspended';
	starred: boolean;
	stateName: string | null;
	cityName: string | null;
	formattedAddress: string | null;
	internationalCityText: string | null;
	countryName: string | null;
	lockerPrefix: string | null;
	lockerCode: string | null;
	ownerBusinessProfileId: string | null;
	isBusinessAccountOwner: boolean;
	createdAt: Date;
}

export interface RecipientPredicateFilter {
	businessAccountId: string;
	callerProfileId: string;
	callerRole: 'owner' | 'member';
	hasShareGuide: boolean;
	hasShareLocker: boolean;
}

export abstract class RecipientRepositoryPort {
	abstract create(data: NewRecipientProps): Promise<{ id: string }>;

	abstract findPaginated(
		filter: RecipientListFilter,
	): Promise<{ items: RecipientListRow[]; total: number }>;

	abstract findByIdWithPredicate(
		id: string,
		predicate: RecipientPredicateFilter,
	): Promise<RecipientListRow | null>;

	abstract updateStarred(
		id: string,
		starred: boolean,
		callerProfileId: string,
	): Promise<{ id: string; starred: boolean; updatedAt: Date }>;
}
