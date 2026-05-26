import { Injectable } from '@nestjs/common';
import type { TCreateRecipientLockerOutput } from '@zoom/schemas';
import { RecipientLockerInvalidException } from '../../domain/exceptions/recipient-locker-invalid.exception';
import type {
	CreateRecipientLockerCommand,
	CreateRecipientLockerUseCasePort,
} from '../ports/in/create-recipient-locker.use-case.port';
import { LockerValidatorPort } from '../ports/out/locker-validator.port';
import { PhonePrefixReaderPort } from '../ports/out/phone-prefix-reader.port';
import { RecipientRepositoryPort } from '../ports/out/recipient-repository.port';

@Injectable()
export class CreateRecipientLockerUseCase
	implements CreateRecipientLockerUseCasePort
{
	constructor(
		private readonly lockerValidator: LockerValidatorPort,
		private readonly phonePrefixRepo: PhonePrefixReaderPort,
		private readonly recipientRepo: RecipientRepositoryPort,
	) {}

	async execute(
		cmd: CreateRecipientLockerCommand,
	): Promise<TCreateRecipientLockerOutput> {
		const lockerResult = await this.lockerValidator.validate(
			cmd.siglas,
			cmd.lockerNumber,
		);

		if (!lockerResult.valid) {
			throw new RecipientLockerInvalidException({
				failureCode: lockerResult.failureCode,
			});
		}

		const cellphonePrefix = await this.phonePrefixRepo.findValueById(
			cmd.cellphonePrefixId,
		);

		const { id } = await this.recipientRepo.create({
			businessAccountId: cmd.businessAccountId,
			ownerBusinessProfileId: cmd.ownerBusinessProfileId,
			isBusinessAccountOwner: cmd.isBusinessAccountOwner,
			deliveryType: 'locker',
			serviceScope: 'national',
			status: 'active',
			name: cmd.contactName,
			contactName: cmd.contactName,
			alias: cmd.alias,
			lockerMasterId: lockerResult.lockerId,
			lockerPrefix: lockerResult.siglas,
			lockerCode: String(cmd.lockerNumber),
			cellphonePrefixId: cmd.cellphonePrefixId,
			cellphonePrefix: cellphonePrefix ?? undefined,
			cellphoneNumber: cmd.cellphoneNumber,
			observation: cmd.observation,
		});

		return {
			id,
			name: cmd.contactName,
			alias: cmd.alias ?? null,
			delivery_type: 'locker',
			service_scope: 'national',
			status: 'active',
			business_account_id: cmd.businessAccountId,
			created_at: new Date().toISOString(),
		};
	}
}
