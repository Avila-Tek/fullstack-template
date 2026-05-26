import type {
	TUpdateBusinessAccountCommand,
	TUpdateBusinessAccountOutput,
} from '@zoom/schemas';

export abstract class UpdateBusinessAccountUseCasePort {
	abstract execute(
		cmd: TUpdateBusinessAccountCommand,
	): Promise<TUpdateBusinessAccountOutput>;
}
