import type { TMemberProfileDetail } from '@zoom/schemas';

export abstract class GetMemberProfileUseCasePort {
	abstract execute(
		requestingUserId: string,
		profileId: string,
	): Promise<TMemberProfileDetail>;
}
