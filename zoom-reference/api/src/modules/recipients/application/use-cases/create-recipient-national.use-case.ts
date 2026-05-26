import { Injectable } from '@nestjs/common';
import type { TCreateRecipientNationalOutput } from '@zoom/schemas';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { CountryRepositoryPort } from '../../../region/application/ports/out/country-repository.port';
import { RecipientDefaultCountryMissingException } from '../../domain/exceptions/recipient-default-country-missing.exception';
import type {
	CreateRecipientNationalCommand,
	CreateRecipientNationalUseCasePort,
} from '../ports/in/create-recipient-national.use-case.port';
import { AddressCreatorPort } from '../ports/out/address-creator.port';
import { DocumentTypeReaderPort } from '../ports/out/document-type-reader.port';
import { PhonePrefixReaderPort } from '../ports/out/phone-prefix-reader.port';
import { RecipientRepositoryPort } from '../ports/out/recipient-repository.port';

@Injectable()
export class CreateRecipientNationalUseCase
	implements CreateRecipientNationalUseCasePort
{
	constructor(
		private readonly recipientRepo: RecipientRepositoryPort,
		private readonly addressRepo: AddressCreatorPort,
		private readonly countryRepo: CountryRepositoryPort,
		private readonly phonePrefixRepo: PhonePrefixReaderPort,
		private readonly documentTypeRepo: DocumentTypeReaderPort,
	) {}

	async execute(
		cmd: CreateRecipientNationalCommand,
	): Promise<TCreateRecipientNationalOutput> {
		const [country, cellphonePrefix, phonePrefix, documentType] =
			await Promise.all([
				this.countryRepo.findDefault(),
				this.phonePrefixRepo.findValueById(cmd.cellphonePrefixId),
				cmd.phonePrefixId
					? this.phonePrefixRepo.findValueById(cmd.phonePrefixId)
					: Promise.resolve(null),
				cmd.documentTypeId
					? this.documentTypeRepo.findCodeById(cmd.documentTypeId)
					: Promise.resolve(null),
			]);

		if (!country) {
			throw new RecipientDefaultCountryMissingException();
		}

		const addr = await this.addressRepo.create({
			formattedAddress: cmd.geocoding?.formattedAddress ?? cmd.addressLong,
			addressLine1: cmd.addressLong,
			countryId: country.id,
			stateId: cmd.stateId,
			cityId: cmd.cityId,
			geoLat: cmd.geocoding?.lat,
			geoLng: cmd.geocoding?.lng,
			geolocationProvider: cmd.geocoding ? 'zoom' : undefined,
			providerAddressId: cmd.geocoding?.providerId,
			providerRouteCode: cmd.geocoding?.route,
			supportedByZoom: Boolean(cmd.geocoding),
			validatedAt: cmd.geocoding ? new Date() : undefined,
		});

		const { id } = await this.recipientRepo.create({
			businessAccountId: cmd.businessAccountId,
			ownerBusinessProfileId: cmd.ownerBusinessProfileId,
			isBusinessAccountOwner: cmd.isBusinessAccountOwner,
			deliveryType: 'guia',
			serviceScope: 'national',
			status: 'active',
			name: cmd.name,
			alias: cmd.alias,
			contactName: cmd.contactName,
			documentTypeId: cmd.documentTypeId,
			documentType: documentType ?? undefined,
			documentNumber: cmd.documentNumber,
			cellphonePrefixId: cmd.cellphonePrefixId,
			cellphonePrefix: cellphonePrefix ?? undefined,
			cellphoneNumber: cmd.cellphoneNumber,
			phonePrefixId: cmd.phonePrefixId,
			phonePrefix: phonePrefix ?? undefined,
			phoneNumber: cmd.phoneNumber,
			email: cmd.email,
			addressId: addr.id,
			locality: cmd.locality,
			observation: cmd.observation,
		});

		recordApiEvent('recipient.create.national.success', {
			module: 'recipients',
			outcome: 'success',
		});

		return {
			id,
			name: cmd.name,
			alias: cmd.alias ?? null,
			delivery_type: 'guia',
			service_scope: 'national',
			status: 'active',
			business_account_id: cmd.businessAccountId,
			created_at: new Date().toISOString(),
		};
	}
}
