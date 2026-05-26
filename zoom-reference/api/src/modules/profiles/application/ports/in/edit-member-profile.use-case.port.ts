import type {
	TEditMemberProfileCommand,
	TEditMemberProfileOutput,
} from '@zoom/schemas';

export abstract class EditMemberProfileUseCasePort {
	abstract execute(
		command: TEditMemberProfileCommand,
	): Promise<TEditMemberProfileOutput>;
}
