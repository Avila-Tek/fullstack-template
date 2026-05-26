import { Injectable } from '@nestjs/common';
import type { TCreateRecipientInternationalOutput } from '@zoom/schemas';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { CountryRepositoryPort } from '../../../region/application/ports/out/country-repository.port';
import type {
	CreateRecipientInternationalCommand,
	CreateRecipientInternationalUseCasePort,
} from '../ports/in/create-recipient-international.use-case.port';
import { AddressCreatorPort } from '../ports/out/address-creator.port';
import { PhonePrefixReaderPort } from '../ports/out/phone-prefix-reader.port';
import { RecipientRepositoryPort } from '../ports/out/recipient-repository.port';

@Injectable()
export class CreateRecipientInternationalUseCase
	implements CreateRecipientInternationalUseCasePort
{
	constructor(
		private readonly recipientRepo: RecipientRepositoryPort,
		private readonly addressRepo: AddressCreatorPort,
		private readonly countryRepo: CountryRepositoryPort,
		private readonly phonePrefixRepo: PhonePrefixReaderPort,
	) {}

	async execute(
		cmd: CreateRecipientInternationalCommand,
	): Promise<TCreateRecipientInternationalOutput> {
		const [country, cellphonePrefix, phonePrefix] = await Promise.all([
			this.countryRepo.findByIsoCode(cmd.internationalShippingCountryCode),
			this.phonePrefixRepo.findValueById(cmd.internationalCellphonePrefixId),
			cmd.internationalPhonePrefixId
				? this.phonePrefixRepo.findValueById(cmd.internationalPhonePrefixId)
				: Promise.resolve(null),
		]);

		const addr = await this.addressRepo.create({
			formattedAddress: cmd.addressLong,
			addressLine1: cmd.addressLong,
			countryId: country?.id ?? null,
			countryCode: cmd.internationalShippingCountryCode,
			countryName: cmd.internationalShippingCountryName,
			internationalCityText: cmd.internationalShippingCityName,
			suburbText: cmd.internationalShippingCitySuburb || null,
			postalCodeText: cmd.internationalShippingCityZipCode || null,
			stateId: null,
			cityId: null,
			geoLat: null,
			geoLng: null,
			supportedByZoom: false,
		});

		const { id } = await this.recipientRepo.create({
			businessAccountId: cmd.businessAccountId,
			ownerBusinessProfileId: cmd.ownerBusinessProfileId,
			isBusinessAccountOwner: cmd.isBusinessAccountOwner,
			deliveryType: 'guia',
			serviceScope: 'international',
			status: 'active',
			name: cmd.name,
			alias: cmd.alias,
			contactName: cmd.contactName,
			internationalDocument: cmd.internationalDocument,
			internationalCellphonePrefixId: cmd.internationalCellphonePrefixId,
			internationalCellphonePrefix: cellphonePrefix ?? undefined,
			cellphoneNumber: cmd.cellphoneNumber,
			internationalPhonePrefixId: cmd.internationalPhonePrefixId,
			internationalPhonePrefix: phonePrefix ?? undefined,
			phoneNumber: cmd.phoneNumber,
			email: cmd.email,
			addressId: addr.id,
			locality: cmd.locality,
			observation: cmd.observation,
		});

		recordApiEvent('recipient.create.international.success', {
			module: 'recipients',
			outcome: 'success',
		});

		return {
			id,
			name: cmd.name,
			alias: cmd.alias ?? null,
			delivery_type: 'guia',
			service_scope: 'international',
			status: 'active',
			business_account_id: cmd.businessAccountId,
			created_at: new Date().toISOString(),
		};
	}
}
