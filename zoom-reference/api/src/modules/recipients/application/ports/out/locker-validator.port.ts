export type RecipientLockerValidateResult =
	| { valid: false; failureCode: string }
	| { valid: true; lockerId: string; siglas: string };

export abstract class LockerValidatorPort {
	abstract validate(
		siglas: string,
		lockerNumber: number,
	): Promise<RecipientLockerValidateResult>;
}
