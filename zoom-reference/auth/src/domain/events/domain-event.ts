// Base marker interface for all domain events.
// Domain events are plain value objects — no framework dependencies.
export interface DomainEvent {
	readonly occurredAt: Date;
}
