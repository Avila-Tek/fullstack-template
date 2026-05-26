import { Injectable } from '@nestjs/common';
import { ValidateLockerUseCasePort } from '../../../pricing/application/ports/in/validate-locker.use-case.port';
import type { RecipientLockerValidateResult } from '../../application/ports/out/locker-validator.port';
import { LockerValidatorPort } from '../../application/ports/out/locker-validator.port';

@Injectable()
export class LockerValidatorAdapter implements LockerValidatorPort {
	constructor(
		private readonly validateLockerUseCase: ValidateLockerUseCasePort,
	) {}

	async validate(
		siglas: string,
		lockerNumber: number,
	): Promise<RecipientLockerValidateResult> {
		const result = await this.validateLockerUseCase.execute({
			siglas,
			lockerNumber,
		});
		if (!result.valid) {
			return { valid: false, failureCode: result.failureCode };
		}
		return { valid: true, lockerId: result.lockerId, siglas: result.siglas };
	}
}
