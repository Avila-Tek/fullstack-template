import { Module } from '@nestjs/common';
import { LOGGER_PORT } from '@zoom/utils';
import { PinoLogger } from 'nestjs-pino';
import { BusinessProfilePermissionRepositoryPort } from '../invitations/application/ports/out/business-profile-permission-repository.port';
import { BusinessProfileServiceRepositoryPort } from '../invitations/application/ports/out/business-profile-service-repository.port';
import { DrizzleBusinessProfilePermissionRepositoryAdapter } from '../invitations/infrastructure/persistence/drizzle-business-profile-permission-repository.adapter';
import { DrizzleBusinessProfileServiceRepositoryAdapter } from '../invitations/infrastructure/persistence/drizzle-business-profile-service-repository.adapter';
import { DrizzlePendingInvitationReaderAdapter } from '../invitations/infrastructure/persistence/drizzle-pending-invitation-reader.adapter';
import { BusinessProfileBillingCityReaderPort } from '../pricing/application/ports/out/business-profile-billing-city-reader.port';
import { LockerReaderPort } from '../pricing/application/ports/out/locker-reader.port';
import { RegionModule } from '../region/region.module';
import { PermissionResolver } from './application/permission-resolver.service';
import { EditMemberProfileUseCasePort } from './application/ports/in/edit-member-profile.use-case.port';
import { GetCitiesWithOfficesUseCasePort } from './application/ports/in/get-cities-with-offices.use-case.port';
import { GetCollaboratorEditContextUseCasePort } from './application/ports/in/get-collaborator-edit-context.use-case.port';
import { GetDocumentTypesUseCasePort } from './application/ports/in/get-document-types.use-case.port';
import { GetEditContextUseCasePort } from './application/ports/in/get-edit-context.use-case.port';
import { GetInternationalPhonePrefixesUseCasePort } from './application/ports/in/get-international-phone-prefixes.use-case.port';
import { GetMemberPermissionsUseCasePort } from './application/ports/in/get-member-permissions.use-case.port';
import { GetNotificationPreferenceUseCasePort } from './application/ports/in/get-notification-preference.use-case.port';
import { GetOfficesByCityUseCasePort } from './application/ports/in/get-offices-by-city.use-case.port';
import { GetPhonePrefixesUseCasePort } from './application/ports/in/get-phone-prefixes.use-case.port';
import { GetProfileAddressUseCasePort } from './application/ports/in/get-profile-address.use-case.port';
import { GetProfileMeUseCasePort } from './application/ports/in/get-profile-me.use-case.port';
import { GetReturnPreferenceUseCasePort } from './application/ports/in/get-return-preference.use-case.port';
import { GetReturnTypesUseCasePort } from './application/ports/in/get-return-types.use-case.port';
import { GetShippingUnitsUseCasePort } from './application/ports/in/get-shipping-units.use-case.port';
import { GetUserPreferencesUseCasePort } from './application/ports/in/get-user-preferences.use-case.port';
import { PersistOnboardingUseCasePort } from './application/ports/in/persist-onboarding.use-case.port';
import { ResolveEditLookupsUseCasePort } from './application/ports/in/resolve-edit-lookups.use-case.port';
import { SyncProfileEmailUseCasePort } from './application/ports/in/sync-profile-email.use-case.port';
import { UpdateBusinessAccountUseCasePort } from './application/ports/in/update-business-account.use-case.port';
import { UpdateCollaboratorProfileUseCasePort } from './application/ports/in/update-collaborator-profile.use-case.port';
import { UpdateNotificationPreferenceUseCasePort } from './application/ports/in/update-notification-preference.use-case.port';
import { UpdateReturnPreferenceUseCasePort } from './application/ports/in/update-return-preference.use-case.port';
import { UpdateUserPreferencesUseCasePort } from './application/ports/in/update-user-preferences.use-case.port';
import { ValidateOnboardingUseCasePort } from './application/ports/in/validate-onboarding.use-case.port';
import { AddressRepositoryPort } from './application/ports/out/address-repository.port';
import { BusinessAccountRepositoryPort } from './application/ports/out/business-account-repository.port';
import { BusinessProfileRepositoryPort } from './application/ports/out/business-profile-repository.port';
import { BusinessProfileReturnPreferenceRepositoryPort } from './application/ports/out/business-profile-return-preference-repository.port';
import { CollaboratorEditContextRepositoryPort } from './application/ports/out/collaborator-edit-context-repository.port';
import { DocumentTypeMasterRepositoryPort } from './application/ports/out/document-type-master-repository.port';
import { EditProfileUnitOfWorkPort } from './application/ports/out/edit-profile-unit-of-work.port';
import { NotificationPreferenceRepositoryPort } from './application/ports/out/notification-preference-repository.port';
import { OfficeMasterRepositoryPort } from './application/ports/out/office-master-repository.port';
import { OnboardingUnitOfWorkPort } from './application/ports/out/onboarding-unit-of-work.port';
import { PendingInvitationReaderPort } from './application/ports/out/pending-invitation-reader.port';
import { PhonePrefixMasterRepositoryPort } from './application/ports/out/phone-prefix-master-repository.port';
import { ReturnTypeMasterRepositoryPort } from './application/ports/out/return-type-master-repository.port';
import { RoleTemplateDefaultsRepositoryPort } from './application/ports/out/role-template-defaults-repository.port';
import { UnitOfMeasureMasterRepositoryPort } from './application/ports/out/unit-of-measure-master-repository.port';
import { EditMemberProfileUseCase } from './application/use-cases/edit-member-profile.use-case';
import { GetCitiesWithOfficesUseCase } from './application/use-cases/get-cities-with-offices.use-case';
import { GetCollaboratorEditContextUseCase } from './application/use-cases/get-collaborator-edit-context.use-case';
import { GetDocumentTypesUseCase } from './application/use-cases/get-document-types.use-case';
import { GetEditContextUseCase } from './application/use-cases/get-edit-context.use-case';
import { GetInternationalPhonePrefixesUseCase } from './application/use-cases/get-international-phone-prefixes.use-case';
import { GetMemberPermissionsUseCase } from './application/use-cases/get-member-permissions.use-case';
import { GetNotificationPreferenceUseCase } from './application/use-cases/get-notification-preference.use-case';
import { GetOfficesByCityUseCase } from './application/use-cases/get-offices-by-city.use-case';
import { GetPhonePrefixesUseCase } from './application/use-cases/get-phone-prefixes.use-case';
import { GetProfileAddressUseCase } from './application/use-cases/get-profile-address.use-case';
import { GetProfileMeUseCase } from './application/use-cases/get-profile-me.use-case';
import { GetReturnPreferenceUseCase } from './application/use-cases/get-return-preference.use-case';
import { GetReturnTypesUseCase } from './application/use-cases/get-return-types.use-case';
import { GetShippingUnitsUseCase } from './application/use-cases/get-shipping-units.use-case';
import { GetUserPreferencesUseCase } from './application/use-cases/get-user-preferences.use-case';
import { PersistOnboardingUseCase } from './application/use-cases/persist-onboarding.use-case';
import { ResolveEditLookupsUseCase } from './application/use-cases/resolve-edit-lookups.use-case';
import { SyncProfileEmailUseCase } from './application/use-cases/sync-profile-email.use-case';
import { UpdateBusinessAccountUseCase } from './application/use-cases/update-business-account.use-case';
import { UpdateCollaboratorProfileUseCase } from './application/use-cases/update-collaborator-profile.use-case';
import { UpdateNotificationPreferenceUseCase } from './application/use-cases/update-notification-preference.use-case';
import { UpdateReturnPreferenceUseCase } from './application/use-cases/update-return-preference.use-case';
import { UpdateUserPreferencesUseCase } from './application/use-cases/update-user-preferences.use-case';
import { ValidateOnboardingUseCase } from './application/use-cases/validate-onboarding.use-case';
import { BusinessProfileBillingCityReaderAdapter } from './infrastructure/adapters/business-profile-billing-city-reader.adapter';
import { LockerReaderAdapter } from './infrastructure/adapters/locker-reader.adapter';
import { ProfilePreferencesController } from './infrastructure/http/profile-preferences.controller';
import { ProfilesController } from './infrastructure/http/profiles.controller';
import { ProfilesInternalController } from './infrastructure/http/profiles-internal.controller';
import { ProfilesMasterController } from './infrastructure/http/profiles-master.controller';
import { DrizzleAddressRepositoryAdapter } from './infrastructure/persistence/drizzle-address-repository.adapter';
import { DrizzleBusinessAccountRepositoryAdapter } from './infrastructure/persistence/drizzle-business-account-repository.adapter';
import { DrizzleBusinessProfileRepositoryAdapter } from './infrastructure/persistence/drizzle-business-profile-repository.adapter';
import { DrizzleBusinessProfileReturnPreferenceRepositoryAdapter } from './infrastructure/persistence/drizzle-business-profile-return-preference-repository.adapter';
import { DrizzleCollaboratorEditContextRepository } from './infrastructure/persistence/drizzle-collaborator-edit-context.repository';
import { DrizzleDocumentTypeMasterRepositoryAdapter } from './infrastructure/persistence/drizzle-document-type-master-repository.adapter';
import { DrizzleEditProfileUnitOfWorkAdapter } from './infrastructure/persistence/drizzle-edit-profile-unit-of-work.adapter';

import { DrizzleNotificationPreferenceRepositoryAdapter } from './infrastructure/persistence/drizzle-notification-preference-repository.adapter';
import { DrizzleOfficeMasterRepositoryAdapter } from './infrastructure/persistence/drizzle-office-master-repository.adapter';
import { DrizzleOnboardingUnitOfWorkAdapter } from './infrastructure/persistence/drizzle-onboarding-unit-of-work.adapter';
import { DrizzlePhonePrefixMasterRepositoryAdapter } from './infrastructure/persistence/drizzle-phone-prefix-master-repository.adapter';
import { DrizzleReturnTypeMasterRepositoryAdapter } from './infrastructure/persistence/drizzle-return-type-master-repository.adapter';
import { DrizzleRoleTemplateDefaultsRepositoryAdapter } from './infrastructure/persistence/drizzle-role-template-defaults-repository.adapter';
import { DrizzleUnitOfMeasureMasterRepositoryAdapter } from './infrastructure/persistence/drizzle-unit-of-measure-master-repository.adapter';

@Module({
	imports: [RegionModule],
	controllers: [
		ProfilesController,
		ProfilesInternalController,
		ProfilesMasterController,
		ProfilePreferencesController,
	],
	exports: [
		AddressRepositoryPort,
		BusinessProfileRepositoryPort,
		BusinessProfilePermissionRepositoryPort,
		BusinessProfileServiceRepositoryPort,
		BusinessProfileBillingCityReaderPort,
		DocumentTypeMasterRepositoryPort,
		LockerReaderPort,
		PermissionResolver,
		PhonePrefixMasterRepositoryPort,
	],
	providers: [
		{ provide: LOGGER_PORT, useExisting: PinoLogger },
		{
			provide: AddressRepositoryPort,
			useClass: DrizzleAddressRepositoryAdapter,
		},
		{
			provide: DocumentTypeMasterRepositoryPort,
			useClass: DrizzleDocumentTypeMasterRepositoryAdapter,
		},
		{
			provide: PhonePrefixMasterRepositoryPort,
			useClass: DrizzlePhonePrefixMasterRepositoryAdapter,
		},
		{
			provide: BusinessAccountRepositoryPort,
			useClass: DrizzleBusinessAccountRepositoryAdapter,
		},
		{
			provide: BusinessProfileRepositoryPort,
			useClass: DrizzleBusinessProfileRepositoryAdapter,
		},
		{
			provide: OnboardingUnitOfWorkPort,
			useClass: DrizzleOnboardingUnitOfWorkAdapter,
		},
		{
			provide: EditProfileUnitOfWorkPort,
			useClass: DrizzleEditProfileUnitOfWorkAdapter,
		},
		{
			provide: BusinessProfilePermissionRepositoryPort,
			useClass: DrizzleBusinessProfilePermissionRepositoryAdapter,
		},
		{
			provide: RoleTemplateDefaultsRepositoryPort,
			useClass: DrizzleRoleTemplateDefaultsRepositoryAdapter,
		},
		{
			provide: UnitOfMeasureMasterRepositoryPort,
			useClass: DrizzleUnitOfMeasureMasterRepositoryAdapter,
		},
		{
			provide: ReturnTypeMasterRepositoryPort,
			useClass: DrizzleReturnTypeMasterRepositoryAdapter,
		},
		{
			provide: ValidateOnboardingUseCasePort,
			useClass: ValidateOnboardingUseCase,
		},
		{
			provide: PersistOnboardingUseCasePort,
			useClass: PersistOnboardingUseCase,
		},
		{
			provide: GetProfileMeUseCasePort,
			useClass: GetProfileMeUseCase,
		},
		{
			provide: GetEditContextUseCasePort,
			useClass: GetEditContextUseCase,
		},
		{
			provide: ResolveEditLookupsUseCasePort,
			useClass: ResolveEditLookupsUseCase,
		},
		{
			provide: UpdateBusinessAccountUseCasePort,
			useClass: UpdateBusinessAccountUseCase,
		},
		{
			provide: UpdateCollaboratorProfileUseCasePort,
			useClass: UpdateCollaboratorProfileUseCase,
		},
		{
			provide: GetDocumentTypesUseCasePort,
			useClass: GetDocumentTypesUseCase,
		},
		{
			provide: GetInternationalPhonePrefixesUseCasePort,
			useClass: GetInternationalPhonePrefixesUseCase,
		},
		{
			provide: GetPhonePrefixesUseCasePort,
			useClass: GetPhonePrefixesUseCase,
		},
		{
			provide: GetShippingUnitsUseCasePort,
			useClass: GetShippingUnitsUseCase,
		},
		{
			provide: GetUserPreferencesUseCasePort,
			useClass: GetUserPreferencesUseCase,
		},
		{
			provide: UpdateUserPreferencesUseCasePort,
			useClass: UpdateUserPreferencesUseCase,
		},
		{
			provide: CollaboratorEditContextRepositoryPort,
			useClass: DrizzleCollaboratorEditContextRepository,
		},
		{
			provide: GetCollaboratorEditContextUseCasePort,
			useClass: GetCollaboratorEditContextUseCase,
		},
		{
			provide: EditMemberProfileUseCasePort,
			useClass: EditMemberProfileUseCase,
		},
		{
			provide: SyncProfileEmailUseCasePort,
			useClass: SyncProfileEmailUseCase,
		},
		{
			provide: NotificationPreferenceRepositoryPort,
			useClass: DrizzleNotificationPreferenceRepositoryAdapter,
		},
		{
			provide: GetNotificationPreferenceUseCasePort,
			useClass: GetNotificationPreferenceUseCase,
		},
		{
			provide: UpdateNotificationPreferenceUseCasePort,
			useClass: UpdateNotificationPreferenceUseCase,
		},
		{
			provide: BusinessProfileServiceRepositoryPort,
			useClass: DrizzleBusinessProfileServiceRepositoryAdapter,
		},
		{
			provide: PendingInvitationReaderPort,
			useClass: DrizzlePendingInvitationReaderAdapter,
		},
		PermissionResolver,
		{
			provide: GetMemberPermissionsUseCasePort,
			useClass: GetMemberPermissionsUseCase,
		},
		{
			provide: BusinessProfileReturnPreferenceRepositoryPort,
			useClass: DrizzleBusinessProfileReturnPreferenceRepositoryAdapter,
		},
		{
			provide: OfficeMasterRepositoryPort,
			useClass: DrizzleOfficeMasterRepositoryAdapter,
		},
		{
			provide: GetReturnTypesUseCasePort,
			useClass: GetReturnTypesUseCase,
		},
		{
			provide: GetReturnPreferenceUseCasePort,
			useClass: GetReturnPreferenceUseCase,
		},
		{
			provide: UpdateReturnPreferenceUseCasePort,
			useClass: UpdateReturnPreferenceUseCase,
		},
		{
			provide: GetProfileAddressUseCasePort,
			useClass: GetProfileAddressUseCase,
		},
		{
			provide: GetCitiesWithOfficesUseCasePort,
			useClass: GetCitiesWithOfficesUseCase,
		},
		{
			provide: GetOfficesByCityUseCasePort,
			useClass: GetOfficesByCityUseCase,
		},
		{
			provide: LockerReaderPort,
			useClass: LockerReaderAdapter,
		},
		{
			provide: BusinessProfileBillingCityReaderPort,
			useClass: BusinessProfileBillingCityReaderAdapter,
		},
	],
})
export class ProfilesModule {}
