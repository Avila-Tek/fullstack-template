import type {
	TGetPreferencesOutput,
	TUpdatePreferencesInput,
} from '@zoom/schemas';

export abstract class UpdateUserPreferencesUseCasePort {
	abstract execute(
		userId: string,
		input: TUpdatePreferencesInput,
	): Promise<TGetPreferencesOutput>;
}
