export abstract class SecurityNotificationPort {
	abstract sendSessionRevokedNotification(
		targetUserId: string,
		email: string,
		twoFactorForced: boolean,
	): Promise<void>;
}
