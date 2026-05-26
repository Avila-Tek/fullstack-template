export const TWO_FACTOR_EVENT_TYPES = [
	'2fa_setup_enrolled',
	'2fa_setup_skipped',
	'2fa_setup_started',
	'2fa_otp_send_rate_limited',
	'2fa_totp_replay_rejected',
	'2fa_enrollment_otp_sent',
	'2fa_enrollment_succeeded',
	'2fa_enrollment_failed',
	'2fa_challenge_succeeded',
	'2fa_challenge_failed',
	'2fa_challenge_locked',
	'2fa_challenge_otp_sent',
	'2fa_activated',
	'2fa_deactivated',
	'2fa_method_switched',
] as const;

export type TwoFactorEventType = (typeof TWO_FACTOR_EVENT_TYPES)[number];

export interface InsertTwoFactorEventParams {
	userId: string;
	eventType: TwoFactorEventType;
	correlationId: string;
	ipHash: string;
	userAgent: string;
	method?: string;
}

export abstract class TwoFactorAuditLogRepositoryPort {
	abstract insertEvent(params: InsertTwoFactorEventParams): Promise<void>;
}
