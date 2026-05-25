export interface UserTwoFactorDto {
	id: string;
	userId: string;
	method: 'sms' | 'totp' | 'email';
	enabled: boolean;
	verifiedAt: Date | null;
}

export type TwoFactorInsertParams = {
	method: 'email' | 'sms' | 'totp';
	verifiedAt: Date;
};

export abstract class TwoFactorRepositoryPort {
	abstract findEnabledByUserId(
		userId: string,
	): Promise<UserTwoFactorDto | null>;
	abstract forceEnableEmail(userId: string): Promise<void>;
	// Always inserts a new row — old rows are kept as history.
	// Caller must call deactivate() first (in the same transaction) to clear the active row.
	abstract insert(userId: string, params: TwoFactorInsertParams): Promise<void>;
	abstract deactivate(userId: string): Promise<void>;
}
