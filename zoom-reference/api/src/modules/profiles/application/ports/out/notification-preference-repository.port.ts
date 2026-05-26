export abstract class NotificationPreferenceRepositoryPort {
	abstract create(businessProfileId: string): Promise<void>;
	abstract findByBusinessProfileId(
		businessProfileId: string,
	): Promise<{ emailEnabled: boolean } | null>;
	abstract upsert(
		businessProfileId: string,
		emailEnabled: boolean,
	): Promise<void>;
}
