import { Module } from '@nestjs/common';
import { LOGGER_PORT } from '@zoom/utils';
import { PinoLogger } from 'nestjs-pino';
import { PricingModule } from '../pricing/pricing.module';
import { AddressRepositoryPort } from '../profiles/application/ports/out/address-repository.port';
import { BusinessProfileRepositoryPort } from '../profiles/application/ports/out/business-profile-repository.port';
import { DocumentTypeMasterRepositoryPort } from '../profiles/application/ports/out/document-type-master-repository.port';
import { PhonePrefixMasterRepositoryPort } from '../profiles/application/ports/out/phone-prefix-master-repository.port';
import { ProfilesModule } from '../profiles/profiles.module';
import { RegionModule } from '../region/region.module';
import { CreateRecipientInternationalUseCasePort } from './application/ports/in/create-recipient-international.use-case.port';
import { CreateRecipientLockerUseCasePort } from './application/ports/in/create-recipient-locker.use-case.port';
import { CreateRecipientNationalUseCasePort } from './application/ports/in/create-recipient-national.use-case.port';
import { ListRecipientsUseCasePort } from './application/ports/in/list-recipients.use-case.port';
import { ToggleFavoriteUseCasePort } from './application/ports/in/toggle-favorite.use-case.port';
import { AddressCreatorPort } from './application/ports/out/address-creator.port';
import { BusinessProfileLookupPort } from './application/ports/out/business-profile-lookup.port';
import { BusinessProfileReaderPort } from './application/ports/out/business-profile-reader.port';
import { DocumentTypeReaderPort } from './application/ports/out/document-type-reader.port';
import { LockerValidatorPort } from './application/ports/out/locker-validator.port';
import { PhonePrefixReaderPort } from './application/ports/out/phone-prefix-reader.port';
import { RecipientRepositoryPort } from './application/ports/out/recipient-repository.port';
import { CreateRecipientInternationalUseCase } from './application/use-cases/create-recipient-international.use-case';
import { CreateRecipientLockerUseCase } from './application/use-cases/create-recipient-locker.use-case';
import { CreateRecipientNationalUseCase } from './application/use-cases/create-recipient-national.use-case';
import { ListRecipientsUseCase } from './application/use-cases/list-recipients.use-case';
import { ToggleFavoriteUseCase } from './application/use-cases/toggle-favorite.use-case';
import { LockerValidatorAdapter } from './infrastructure/adapters/locker-validator.adapter';
import { PublicRecipientsController } from './infrastructure/http/public-recipients.controller';
import { RecipientsController } from './infrastructure/http/recipients.controller';
import { DrizzleRecipientRepositoryAdapter } from './infrastructure/persistence/drizzle-recipient-repository.adapter';

@Module({
	imports: [ProfilesModule, RegionModule, PricingModule],
	controllers: [RecipientsController, PublicRecipientsController],
	providers: [
		{ provide: LOGGER_PORT, useExisting: PinoLogger },
		{
			provide: RecipientRepositoryPort,
			useClass: DrizzleRecipientRepositoryAdapter,
		},
		{
			provide: AddressCreatorPort,
			useExisting: AddressRepositoryPort,
		},
		{
			provide: PhonePrefixReaderPort,
			useExisting: PhonePrefixMasterRepositoryPort,
		},
		{
			provide: DocumentTypeReaderPort,
			useExisting: DocumentTypeMasterRepositoryPort,
		},
		{
			provide: BusinessProfileLookupPort,
			useExisting: BusinessProfileRepositoryPort,
		},
		{
			provide: BusinessProfileReaderPort,
			useExisting: BusinessProfileRepositoryPort,
		},
		{
			provide: LockerValidatorPort,
			useClass: LockerValidatorAdapter,
		},
		{
			provide: CreateRecipientNationalUseCasePort,
			useClass: CreateRecipientNationalUseCase,
		},
		{
			provide: CreateRecipientInternationalUseCasePort,
			useClass: CreateRecipientInternationalUseCase,
		},
		{
			provide: CreateRecipientLockerUseCasePort,
			useClass: CreateRecipientLockerUseCase,
		},
		{
			provide: ListRecipientsUseCasePort,
			useClass: ListRecipientsUseCase,
		},
		{
			provide: ToggleFavoriteUseCasePort,
			useClass: ToggleFavoriteUseCase,
		},
	],
})
export class RecipientsModule {}
