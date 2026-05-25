import type {
	TValidateOnboardingInput,
	TValidateOnboardingOutput,
} from '@zoom/schemas';

export abstract class ValidateOnboardingUseCasePort {
	abstract execute(
		input: TValidateOnboardingInput,
	): Promise<TValidateOnboardingOutput>;
}
