import type {
	TSyncProfileEmailCommand,
	TSyncProfileEmailOutput,
} from '@zoom/schemas';

export abstract class SyncProfileEmailUseCasePort {
	abstract execute(
		cmd: TSyncProfileEmailCommand,
	): Promise<TSyncProfileEmailOutput>;
}
