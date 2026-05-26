import type { TNotificationPreferenceOutput } from '@zoom/schemas';

export abstract class GetNotificationPreferenceUseCasePort {
	abstract execute(userId: string): Promise<TNotificationPreferenceOutput>;
}
