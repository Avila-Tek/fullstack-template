import type { TMemberPermissionsRead } from '@zoom/schemas';

export interface GetMemberPermissionsCommand {
	requestingUserId: string;
	targetProfileId: string;
}

export abstract class GetMemberPermissionsUseCasePort {
	abstract execute(
		command: GetMemberPermissionsCommand,
	): Promise<TMemberPermissionsRead>;
}
