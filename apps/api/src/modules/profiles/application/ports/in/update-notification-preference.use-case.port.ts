import type {
	TNotificationPreferenceOutput,
	TUpdateNotificationPreferenceInput,
} from '@zoom/schemas';

export abstract class UpdateNotificationPreferenceUseCasePort {
	abstract execute(
		userId: string,
		preference: TUpdateNotificationPreferenceInput['preference'],
	): Promise<TNotificationPreferenceOutput>;
}
