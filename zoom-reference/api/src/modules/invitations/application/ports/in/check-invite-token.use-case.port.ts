import type {
	TCheckInviteTokenCommand,
	TCheckInviteTokenOutput,
} from '@zoom/schemas';

export abstract class CheckInviteTokenUseCasePort {
	abstract execute(
		cmd: TCheckInviteTokenCommand,
	): Promise<TCheckInviteTokenOutput>;
}
