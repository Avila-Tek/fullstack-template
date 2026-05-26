import type { TCreateRecipientNationalOutput } from '@zoom/schemas';

export interface CreateRecipientNationalCommand {
	name: string;
	alias?: string;
	documentTypeId: string;
	documentNumber: string;
	stateId: string;
	cityId: string;
	addressLong: string;
	contactName: string;
	cellphonePrefixId: string;
	cellphoneNumber: string;
	locality?: string;
	phonePrefixId?: string;
	phoneNumber?: string;
	email?: string;
	observation?: string;
	userId: string;
	businessAccountId: string;
	ownerBusinessProfileId: string;
	isBusinessAccountOwner: boolean;
	geocoding?: {
		lat: string;
		lng: string;
		formattedAddress: string;
		route?: string;
		providerId: string;
	};
}

export abstract class CreateRecipientNationalUseCasePort {
	abstract execute(
		cmd: CreateRecipientNationalCommand,
	): Promise<TCreateRecipientNationalOutput>;
}
