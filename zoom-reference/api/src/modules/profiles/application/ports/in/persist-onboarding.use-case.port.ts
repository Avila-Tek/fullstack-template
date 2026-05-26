import type {
	TPersistOnboardingCommand,
	TPersistOnboardingOutput,
} from '@zoom/schemas';

export abstract class PersistOnboardingUseCasePort {
	abstract execute(
		cmd: TPersistOnboardingCommand,
	): Promise<TPersistOnboardingOutput>;
}
