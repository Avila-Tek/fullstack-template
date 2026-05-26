import type { TCreateRecipientLockerOutput } from '@zoom/schemas';

export interface CreateRecipientLockerCommand {
	siglas: string;
	lockerNumber: number;
	contactName: string;
	alias?: string;
	cellphonePrefixId: string;
	cellphoneNumber: string;
	observation?: string;
	userId: string;
	businessAccountId: string;
	ownerBusinessProfileId: string;
	isBusinessAccountOwner: boolean;
}

export abstract class CreateRecipientLockerUseCasePort {
	abstract execute(
		cmd: CreateRecipientLockerCommand,
	): Promise<TCreateRecipientLockerOutput>;
}
