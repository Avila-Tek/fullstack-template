import type { TUnitOfMeasure } from '@zoom/schemas';

export interface ProfileRecord {
	id: string;
	role: 'owner' | 'member';
	status: 'active' | 'invited' | 'suspended';
	businessAccountId: string;
}

export interface UserPreferencesRecord {
	weightUnit: TUnitOfMeasure | null;
	dimensionUnit: TUnitOfMeasure | null;
}

export interface UpdatePreferencesData {
	internationalMaritimeWeightUnitId?: string;
	internationalMaritimeDimensionUnitId?: string;
}

export interface BusinessOwnerRecord {
	id: string;
	businessAccountId: string;
}

export interface CurrentUserRecord {
	businessProfileId: string;
	legalName: string | null;
	email: string | null;
	/** Already masked — exactly 4 chars. '****' when the code is null or shorter. */
	clientCodeLastFour: string;
	coreClientStatus: 'active' | 'inactive';
}

export interface ProfileDetailRecord {
	id: string;
	role: 'owner' | 'member';
	status: 'active' | 'suspended' | 'invited';
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	phoneNumber: string | null;
	phonePrefixId: string | null;
	phonePrefix: string | null;
	documentTypeId: string;
	documentType: string;
	documentNumber: string;
	businessAccountId: string | null;
	// Additional profile fields — read from business_profile
	legalName: string | null;
	billingAddressId: string | null;
	billingAddressLine1: string | null;
	billingAddressCountryId: string | null;
	billingAddressStateId: string | null;
	billingAddressCityId: string | null;
}

export interface NewBusinessProfileProps {
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
	businessAccountId: string;
	userId: string;
	role: 'owner';
}

export interface UpdateOwnerSyncFields {
	firstName: string | null;
	lastName: string | null;
	legalName: string | null;
	phonePrefixId: string | null;
	phonePrefix: string | null;
	phoneNumber: string | null;
	billingAddressId: string | null;
}

export interface UpdateMemberFields {
	firstName?: string;
	lastName?: string;
	legalName?: string;
	phonePrefixId?: string;
	phonePrefix?: string;
	phoneNumber?: string;
	billingAddressId?: string | null;
	isCustomized?: boolean;
	roleTemplateId?: string | null;
}

export interface CollaboratorForUpdateRecord {
	id: string;
	status: 'active' | 'invited' | 'suspended';
	firstName: string | null;
	lastName: string | null;
	legalName: string | null;
	phonePrefixId: string | null;
	phonePrefix: string | null;
	phoneNumber: string | null;
	billingAddressId: string | null;
	roleTemplateId: string | null;
}
export interface NewInvitedBusinessProfileProps {
	documentTypeId: string;
	documentType: string;
	documentNumber: string;
	firstName?: string | null;
	lastName?: string | null;
	legalName?: string | null;
	phonePrefixId?: string | null;
	phonePrefix?: string | null;
	phoneNumber?: string | null;
	email: string;
	billingAddressId: string;
	businessAccountId: string;
	userId: string;
	roleTemplateId?: string;
	isCustomized: boolean;
	invitedByUserId: string;
	invitedAt: Date;
}

export interface CollaboratorRecord {
	id: string;
	businessAccountId: string;
	status: 'active' | 'suspended' | 'invited';
	email: string | null;
	userId: string | null;
}

export abstract class BusinessProfileRepositoryPort {
	abstract findOwnerByUserId(
		userId: string,
	): Promise<BusinessOwnerRecord | null>;

	abstract findOwnerInAccount(
		userId: string,
		businessAccountId: string,
	): Promise<{ id: string } | null>;

	abstract findActiveOrInvitedByEmail(
		normalizedEmail: string,
	): Promise<{ id: string } | null>;

	abstract findCurrentUserByUserId(
		userId: string,
	): Promise<CurrentUserRecord | null>;

	abstract findProfileDetailByUserId(
		userId: string,
	): Promise<ProfileDetailRecord | null>;

	abstract create(data: NewBusinessProfileProps): Promise<{ id: string }>;

	abstract findOwnerForUpdate(
		userId: string,
		businessAccountId: string,
	): Promise<{ id: string } | null>;

	abstract updateOwnerSync(
		userId: string,
		businessAccountId: string,
		fields: UpdateOwnerSyncFields,
	): Promise<void>;

	abstract findMemberForUpdate(
		userId: string,
		businessAccountId: string,
	): Promise<{
		id: string;
		firstName: string | null;
		lastName: string | null;
		legalName: string | null;
		documentTypeId: string;
		documentNumber: string;
		phonePrefixId: string | null;
		phonePrefix: string | null;
		phoneNumber: string | null;
		billingAddressId: string | null;
	} | null>;

	abstract updateMember(
		userId: string,
		businessAccountId: string,
		fields: UpdateMemberFields,
	): Promise<void>;

	abstract findPreferencesByUserId(
		userId: string,
	): Promise<UserPreferencesRecord | null>;

	abstract updatePreferencesByUserId(
		userId: string,
		data: UpdatePreferencesData,
	): Promise<void>;

	abstract createInvited(
		data: NewInvitedBusinessProfileProps,
	): Promise<{ id: string }>;

	/** Activate a pre-created invited profile when the invitee accepts. */
	abstract activateByInvite(
		businessProfileId: string,
		userId: string,
		now: Date,
	): Promise<void>;

	/** Soft-delete a pre-created invited profile when the invitee rejects. */
	abstract softDeleteByInviteRejection(
		businessProfileId: string,
		deletedByUserId: string,
		now: Date,
	): Promise<void>;

	abstract findCollaboratorForUpdate(
		collaboratorProfileId: string,
		businessAccountId: string,
	): Promise<CollaboratorForUpdateRecord | null>;

	abstract updateCollaboratorById(
		collaboratorProfileId: string,
		businessAccountId: string,
		fields: UpdateMemberFields,
	): Promise<void>;

	abstract findCollaboratorById(id: string): Promise<CollaboratorRecord | null>;

	abstract suspendCollaborator(
		id: string,
		suspendedByUserId: string,
		now: Date,
	): Promise<void>;

	abstract reactivateCollaborator(id: string): Promise<void>;

	abstract removeCollaborator(
		id: string,
		deletedByUserId: string,
		now: Date,
	): Promise<void>;

	abstract updateEmail(userId: string, email: string): Promise<void>;

	abstract findProfileByUserId(userId: string): Promise<ProfileRecord | null>;

	abstract findProfileById(profileId: string): Promise<ProfileRecord | null>;

	abstract findNamesByIds(ids: string[]): Promise<Map<string, string | null>>;
}
