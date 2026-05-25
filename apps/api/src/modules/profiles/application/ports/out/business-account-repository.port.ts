export interface NewBusinessAccountProps {
	coreClientCode: string;
	coreClientStatus: 'active' | 'inactive';
	documentTypeId: string;
	documentType: string;
	documentNumber: string;
	firstName?: string | null;
	lastName?: string | null;
	legalName?: string | null;
	phonePrefixId?: string | null;
	phonePrefix?: string | null;
	phoneNumber?: string | null;
	email?: string | null;
	billingAddressId?: string | null;
}

export interface EditContextAccountRecord {
	coreClientCode: string;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
	legalName: string | null;
	phonePrefixId: string | null;
	phonePrefix: string | null;
	phoneNumber: string | null;
}

export interface UpdateBusinessAccountFields {
	legalName: string | null;
	firstName: string | null;
	lastName: string | null;
	phonePrefixId: string | null;
	phonePrefix: string | null;
	phoneNumber: string | null;
	billingAddressId: string | null;
}

export abstract class BusinessAccountRepositoryPort {
	abstract existsByDocument(
		documentTypeId: string,
		documentNumber: string,
	): Promise<boolean>;

	abstract create(data: NewBusinessAccountProps): Promise<{ id: string }>;

	abstract findEditContextById(
		businessAccountId: string,
	): Promise<EditContextAccountRecord | null>;

	abstract findByIdForUpdate(businessAccountId: string): Promise<{
		id: string;
		billingAddressId: string | null;
		isDeleted: boolean;
		firstName: string | null;
		lastName: string | null;
		legalName: string | null;
		phonePrefixId: string | null;
		phonePrefix: string | null;
		phoneNumber: string | null;
	} | null>;

	abstract updateEditable(
		businessAccountId: string,
		fields: UpdateBusinessAccountFields,
	): Promise<void>;
}
