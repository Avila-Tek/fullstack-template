import type { TCreateRecipientInternationalOutput } from '@zoom/schemas';

export interface CreateRecipientInternationalCommand {
	name: string;
	alias?: string;
	internationalDocument?: string;
	internationalShippingCountryCode: string;
	internationalShippingCountryName: string;
	internationalShippingCityName: string;
	internationalShippingCityZipCode?: string;
	internationalShippingCitySuburb?: string;
	addressLong: string;
	locality?: string;
	contactName: string;
	internationalCellphonePrefixId: string;
	cellphoneNumber: string;
	internationalPhonePrefixId?: string;
	phoneNumber?: string;
	email?: string;
	observation?: string;
	businessAccountId: string;
	ownerBusinessProfileId: string;
	isBusinessAccountOwner: boolean;
}

export abstract class CreateRecipientInternationalUseCasePort {
	abstract execute(
		cmd: CreateRecipientInternationalCommand,
	): Promise<TCreateRecipientInternationalOutput>;
}
