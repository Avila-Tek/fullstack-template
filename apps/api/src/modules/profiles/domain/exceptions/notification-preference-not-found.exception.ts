import { DomainException } from '@zoom/utils';

export class NotificationPreferenceNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_NOTIFICATION_PREFERENCE_NOT_FOUND', meta);
	}
}
