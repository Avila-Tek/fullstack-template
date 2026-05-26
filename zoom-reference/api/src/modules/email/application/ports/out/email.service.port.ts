// Outbound port — decouples use cases from the email transport.
export abstract class EmailServicePort {
	abstract sendInvitationEmail(
		to: string,
		plaintextToken: string,
	): Promise<void>;
	abstract sendCollaboratorSuspendedEmail(to: string): Promise<void>;
	abstract sendCollaboratorReactivatedEmail(to: string): Promise<void>;
	abstract sendCollaboratorRemovedEmail(to: string): Promise<void>;
}
