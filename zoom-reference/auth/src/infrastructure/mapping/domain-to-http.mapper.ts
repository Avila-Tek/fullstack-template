import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';

@Injectable()
export class DomainToHttpMapper {
	constructor(
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	private static readonly STATUS: Record<string, number> = {
		AUTH_ACCESS_DENIED: 403,
		AUTH_CANNOT_REMOVE_OWNER: 403,
		AUTH_EMAIL_DELIVERY_FAILED: 503,
		AUTH_INVALID_API_BASE_URL: 422,
		AUTH_INVALID_CREDENTIALS: 401,
		AUTH_INVALID_PASSWORD: 400,
		AUTH_MEMBER_NOT_FOUND: 404,
		AUTH_NO_PASSWORD_ACCOUNT: 400,
		AUTH_NOT_PLATFORM_ADMIN: 403,
		AUTH_NOT_SYSTEM_ADMIN: 403,
		AUTH_PASSWORD_REUSE: 422,
		AUTH_SESSION_EXPIRED: 401,
		AUTH_SESSION_INVALIDATED: 401,
		AUTH_SYSTEM_CONFLICT: 409,
		AUTH_SYSTEM_INACTIVE: 401,
		AUTH_SYSTEM_NOT_FOUND: 404,
		AUTH_TERMS_NO_ACTIVE_VERSION: 404,
		AUTH_USER_NOT_FOUND: 404,
		AUTH_2FA_LOCKED: 429,
		AUTH_2FA_OTP_RATE_LIMITED: 429,
		AUTH_2FA_TOTP_REPLAY: 422,
		AUTH_2FA_SMS_DELIVERY_FAILED: 503,
	};

	map(errorCode: string): number {
		const status = DomainToHttpMapper.STATUS[errorCode];
		if (status === undefined) {
			this.logger.warn(
				{ event: 'http.mapper.unmapped_error', errorCode },
				`Unmapped domain error code "${errorCode}" — defaulting to 500`,
			);
			return 500;
		}
		return status;
	}
}
