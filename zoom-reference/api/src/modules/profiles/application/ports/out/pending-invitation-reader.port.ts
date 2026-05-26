export interface PendingInvitationRecord {
	id: string;
	businessAccountName: string;
	role: 'member';
}

export abstract class PendingInvitationReaderPort {
	abstract findPendingByProfileId(
		profileId: string,
	): Promise<PendingInvitationRecord | null>;
}
